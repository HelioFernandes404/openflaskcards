// apps/api/internal/shared/config/config.go
package config

import (
	"fmt"

	"github.com/kelseyhightower/envconfig"
)

type Config struct {
	// HTTP
	Port int    `envconfig:"PORT" default:"3030"`
	Env  string `envconfig:"ENVIRONMENT" default:"development"`

	// Database
	DatabaseURL string `envconfig:"DATABASE_URL" required:"true"`

	// JWT
	JWTSecret             string `envconfig:"JWT_SECRET" required:"true"`
	AccessTokenTTLMinutes int    `envconfig:"ACCESS_TOKEN_EXPIRE_MINUTES" default:"60"`
	RefreshTokenTTLDays   int    `envconfig:"REFRESH_TOKEN_EXPIRE_DAYS" default:"30"`

	// Redis (TTS cache)
	RedisHost          string `envconfig:"REDIS_TTS_HOST" default:"localhost"`
	RedisPort          int    `envconfig:"REDIS_TTS_PORT" default:"6379"`
	RedisDB            int    `envconfig:"REDIS_TTS_DB" default:"1"`
	TTSCacheTTLSeconds int    `envconfig:"TTS_CACHE_TTL" default:"31536000"`
	TTSProvider        string `envconfig:"TTS_PROVIDER" default:"google"`

	// Google TTS
	GoogleCredentialsPath string  `envconfig:"GOOGLE_APPLICATION_CREDENTIALS" default:""`
	GoogleCredentialsJSON string  `envconfig:"GOOGLE_APPLICATION_CREDENTIALS_JSON" default:""`
	TTSLanguage           string  `envconfig:"TTS_LANGUAGE" default:"en-US"`
	TTSVoiceName          string  `envconfig:"TTS_VOICE_NAME" default:"en-US-Chirp3-HD-Algenib"`
	TTSSpeakingRate       float64 `envconfig:"TTS_SPEAKING_RATE" default:"0.80"`

	// ElevenLabs TTS
	ElevenLabsAPIKey  string `envconfig:"TTS_ELEVENLABS_API_KEY" default:""`
	ElevenLabsVoiceID string `envconfig:"TTS_ELEVENLABS_VOICE_ID" default:""`
	ElevenLabsModelID string `envconfig:"TTS_ELEVENLABS_MODEL_ID" default:"eleven_multilingual_v2"`
	ElevenLabsBaseURL string `envconfig:"TTS_ELEVENLABS_BASE_URL" default:"https://api.elevenlabs.io"`

	ElevenLabsStability       float64 `envconfig:"TTS_ELEVENLABS_STABILITY" default:"0.5"`
	ElevenLabsSimilarityBoost float64 `envconfig:"TTS_ELEVENLABS_SIMILARITY_BOOST" default:"0.75"`
	ElevenLabsStyle           float64 `envconfig:"TTS_ELEVENLABS_STYLE" default:"0"`
	ElevenLabsUseSpeakerBoost bool    `envconfig:"TTS_ELEVENLABS_USE_SPEAKER_BOOST" default:"true"`
	ElevenLabsSpeed           float64 `envconfig:"TTS_ELEVENLABS_SPEED" default:"1.0"`
	ElevenLabsOutputFormat    string  `envconfig:"TTS_ELEVENLABS_OUTPUT_FORMAT" default:"mp3_44100_128"`

	// Piper TTS
	PiperBaseURL string `envconfig:"TTS_PIPER_BASE_URL" default:""`
	PiperPath    string `envconfig:"TTS_PIPER_PATH" default:"/synthesize"`
	PiperToken   string `envconfig:"TTS_PIPER_TOKEN" default:""`
	PiperVoice   string `envconfig:"TTS_PIPER_VOICE" default:""`
	PiperModel   string `envconfig:"TTS_PIPER_MODEL" default:""`

	// Media
	MediaDir           string `envconfig:"MEDIA_DIR" default:"./media"`
	MediaMaxImageBytes int64  `envconfig:"MEDIA_MAX_IMAGE_BYTES" default:"10485760"`

	// Logging
	LogLevel string `envconfig:"LOG_LEVEL" default:"info"`

	// CORS
	CORSAllowedOrigins []string `envconfig:"CORS_ALLOWED_ORIGINS" default:"http://localhost:5173"`

	// TrustedProxies lists the IPs/CIDRs of reverse proxies allowed to set
	// X-Forwarded-For/X-Real-IP. Empty (the default) means no proxy is
	// trusted, so gin.Engine.ClientIP() always uses the real TCP peer
	// address instead of a client-supplied header.
	TrustedProxies []string `envconfig:"TRUSTED_PROXIES" default:""`

	// FSRS optimizer sidecar (fsrs-rs)
	FSRSOptimizerBin string `envconfig:"FSRS_OPTIMIZER_BIN" default:"/app/openflaskcards-fsrs-optimize"`
}

func Load() (*Config, error) {
	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}
	if len(cfg.JWTSecret) < 32 {
		return nil, fmt.Errorf("config: JWT_SECRET must be at least 32 characters")
	}
	return &cfg, nil
}
