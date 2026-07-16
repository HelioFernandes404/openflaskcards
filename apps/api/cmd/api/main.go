package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	texttospeech "cloud.google.com/go/texttospeech/apiv1"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/cards"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/decks"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/kanban"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/letters"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/media"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/modules"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/notes"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/prompttemplates"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/cache"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/config"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs/optimize"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/logger"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/middleware"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/tts"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/studyplans"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/users"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// defaultMaxBodyBytes bounds the size of any JSON/form request body across
// the API. It must stay well above the largest legitimate text payload
// (card front/back markdown, etc.) but far below what could exhaust process
// memory. The media upload endpoint overrides this with its own, larger
// limit derived from cfg.MediaMaxImageBytes.
const defaultMaxBodyBytes = 5 << 20 // 5MB

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "fatal: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	log, err := logger.New(cfg.LogLevel, cfg.Env)
	if err != nil {
		return err
	}
	defer func() { _ = log.Sync() }()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	redis, err := cache.NewRedis(ctx, cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Warn("redis unavailable, continuing without TTS cache", zap.Error(err))
	}

	ttsClient, err := newTTSClient(ctx, cfg)
	if err != nil {
		return err
	}
	ttsSvc, err := tts.NewService(tts.Config{
		Provider:     cfg.TTSProvider,
		Redis:        redis,
		CacheTTLSecs: cfg.TTSCacheTTLSeconds,
		Google: tts.GoogleConfig{
			Client:       ttsClient,
			Language:     cfg.TTSLanguage,
			VoiceName:    cfg.TTSVoiceName,
			SpeakingRate: cfg.TTSSpeakingRate,
		},
		ElevenLabs: tts.ElevenLabsConfig{
			APIKey:          cfg.ElevenLabsAPIKey,
			VoiceID:         cfg.ElevenLabsVoiceID,
			ModelID:         cfg.ElevenLabsModelID,
			BaseURL:         cfg.ElevenLabsBaseURL,
			Stability:       cfg.ElevenLabsStability,
			SimilarityBoost: cfg.ElevenLabsSimilarityBoost,
			Style:           cfg.ElevenLabsStyle,
			UseSpeakerBoost: cfg.ElevenLabsUseSpeakerBoost,
			Speed:           cfg.ElevenLabsSpeed,
			OutputFormat:    cfg.ElevenLabsOutputFormat,
		},
		Piper: tts.PiperConfig{
			BaseURL: cfg.PiperBaseURL,
			Path:    cfg.PiperPath,
			Token:   cfg.PiperToken,
			Voice:   cfg.PiperVoice,
			Model:   cfg.PiperModel,
		},
	})
	if err != nil {
		return err
	}

	scheduler := fsrs.New()

	usersSvc := users.NewService(pool, users.WithOptimizerRunner(optimize.Runner{
		Binary:  cfg.FSRSOptimizerBin,
		Timeout: 120 * time.Second,
	}))
	if err := usersSvc.EnsureDefaultUser(ctx, auth.DefaultUserID); err != nil {
		return fmt.Errorf("ensure default user: %w", err)
	}
	if err := usersSvc.ReconcileStaleOptimizations(ctx); err != nil {
		log.Warn("failed to reconcile stale FSRS optimizations on startup", zap.Error(err))
	}
	decksSvc := decks.NewService(pool)
	modulesSvc := modules.NewService(pool)
	notesSvc := notes.NewService(pool)
	promptTemplatesSvc := prompttemplates.NewService(pool)
	lettersSvc := letters.NewService(pool)
	studyPlansSvc := studyplans.NewService(pool)
	kanbanSvc := kanban.NewService(pool)
	mediaSvc := media.NewService(media.NewRepository(pool), cfg.MediaDir, cfg.MediaMaxImageBytes)
	cardsSvc := cards.NewService(pool, scheduler, ttsSvc, cards.WithLogger(log), cards.WithMediaOwnerChecker(mediaSvc))

	usersH := users.NewHandler(usersSvc)
	decksH := decks.NewHandler(decksSvc)
	modulesH := modules.NewHandler(modulesSvc)
	notesH := notes.NewHandler(notesSvc)
	promptTemplatesH := prompttemplates.NewHandler(promptTemplatesSvc)
	lettersH := letters.NewHandler(lettersSvc)
	studyPlansH := studyplans.NewHandler(studyPlansSvc)
	kanbanH := kanban.NewHandler(kanbanSvc)
	cardsH := cards.NewHandler(cardsSvc)
	mediaH := media.NewHandler(mediaSvc)

	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.New()
	// Only headers set by an explicitly trusted reverse proxy may override
	// the client IP; otherwise ClientIP() falls back to the real TCP peer.
	// This keeps the auth rate limiter (keyed by ClientIP) from being
	// bypassed by an attacker sending a different X-Forwarded-For per request.
	if err := r.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		return fmt.Errorf("set trusted proxies: %w", err)
	}
	r.Use(middleware.Recovery(log))
	// Bound every request body before any handler's JSON decoder or form
	// parser buffers it into memory; the media upload handler applies its
	// own, larger limit for the upload endpoint specifically.
	r.Use(middleware.MaxBodySize(defaultMaxBodyBytes))
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RequestID())
	r.Use(middleware.InjectLogger(log))
	r.Use(middleware.AccessLog(log))
	r.Use(corsMiddleware(cfg.CORSAllowedOrigins))
	r.GET("/health", middleware.HealthCheck(middleware.HealthDeps{
		Pool:  pool,
		Redis: redis,
		TTS:   ttsSvc,
	}))

	rateLimiter := cache.NewRedisRateLimiter(redis)
	// TTS synthesis hits a paid provider on cache miss and the cache key is
	// trivially bypassed by any whitespace/punctuation change in the input
	// text, so it needs its own per-user quota (see openflashcards issue for
	// cogcs#37).
	ttsSynthesizeRateLimit := middleware.RateLimit(rateLimiter, 30, time.Hour, middleware.ByUserID)

	api := r.Group("/api/v1")
	usersH.RegisterRoutes(api.Group("/users"))
	decksH.RegisterRoutes(api.Group("/decks"))
	modulesH.RegisterRoutes(api.Group("/modules"))
	notesH.RegisterRoutes(api.Group("/notes"))
	promptTemplatesH.RegisterRoutes(api.Group("/prompt-templates"))
	lettersH.RegisterRoutes(api.Group("/letters"))
	studyPlansH.RegisterRoutes(api.Group("/study-plans"))
	kanbanH.RegisterRoutes(api.Group("/kanban-cards"))
	cardsH.RegisterCardRoutes(api.Group("/cards"), ttsSynthesizeRateLimit)
	cardsH.RegisterDeckCardRoutes(api.Group("/decks"))
	mediaH.RegisterRoutes(api.Group("/media"))

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%d", cfg.Port),
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       60 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Info("api listening", zap.Int("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("server", zap.Error(err))
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	log.Info("shutting down")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}

	// Drain in-flight FSRS optimizations before the deferred pool.Close(),
	// so a deploy doesn't kill a job mid-write and strand the user's
	// optimization_status in "running".
	jobsCtx, jobsCancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer jobsCancel()
	if err := usersSvc.WaitForJobs(jobsCtx); err != nil {
		log.Warn("optimization jobs did not finish before shutdown", zap.Error(err))
	}
	return nil
}

// corsMiddleware allows the configured frontend origins to call the API
// directly (e.g. local dev where the web app is not proxied).
func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[strings.TrimSpace(o)] = true
	}
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
			c.Header("Access-Control-Expose-Headers", "X-Request-ID")
		}
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func newTTSClient(ctx context.Context, cfg *config.Config) (*texttospeech.Client, error) {
	if strings.TrimSpace(cfg.TTSProvider) != "" && strings.ToLower(strings.TrimSpace(cfg.TTSProvider)) != tts.ProviderGoogle {
		return nil, nil
	}
	client, err := texttospeech.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("google tts client init: %w", err)
	}
	return client, nil
}
