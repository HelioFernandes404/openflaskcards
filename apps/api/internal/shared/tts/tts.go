// Package tts routes text-to-speech requests to a configured provider with Redis-backed cache.
package tts

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// Service synthesizes text using the configured TTS provider and caches the result.
type Service struct {
	provider Provider
	redis    *redis.Client
	cacheTTL time.Duration
}

// Config configures the TTS service and selects the provider router.
type Config struct {
	Provider string
	Redis    *redis.Client

	CacheTTLSecs int

	Google     GoogleConfig
	ElevenLabs ElevenLabsConfig
	Piper      PiperConfig
}

// NewService builds the configured provider and returns a cached TTS service.
func NewService(cfg Config) (*Service, error) {
	provider, err := newProvider(cfg)
	if err != nil {
		return nil, err
	}
	return &Service{
		provider: provider,
		redis:    cfg.Redis,
		cacheTTL: time.Duration(cfg.CacheTTLSecs) * time.Second,
	}, nil
}

// Synthesize returns the provider payload for the given text, using Redis as cache.
func (s *Service) Synthesize(ctx context.Context, text string) (string, error) {
	if s.provider == nil {
		return "", fmt.Errorf("tts: provider not configured")
	}
	key := s.cacheKey(text)
	if s.redis != nil {
		if cached, err := s.redis.Get(ctx, key).Result(); err == nil && cached != "" {
			return cached, nil
		}
	}
	payload, err := s.provider.Synthesize(ctx, text)
	if err != nil {
		return "", fmt.Errorf("tts: synthesize: %w", err)
	}
	encoded := payload
	if s.redis != nil {
		_ = s.redis.Set(ctx, key, encoded, s.cacheTTL).Err()
	}
	return encoded, nil
}

func (s *Service) cacheKey(text string) string {
	sum := sha256.Sum256([]byte(fmt.Sprintf("%s|%s", s.provider.CacheKey(), strings.TrimSpace(text))))
	return "tts:" + hex.EncodeToString(sum[:])
}
