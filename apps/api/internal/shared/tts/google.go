package tts

import (
	"context"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	texttospeech "cloud.google.com/go/texttospeech/apiv1"
	"cloud.google.com/go/texttospeech/apiv1/texttospeechpb"
)

// GoogleConfig configures the Google Cloud TTS provider.
type GoogleConfig struct {
	Client       *texttospeech.Client
	Language     string
	VoiceName    string
	SpeakingRate float64
}

// GoogleProvider synthesizes text through Google Cloud Text-to-Speech.
type GoogleProvider struct {
	client       *texttospeech.Client
	language     string
	voiceName    string
	speakingRate float64
}

// NewGoogleProvider validates and creates a Google TTS provider.
func NewGoogleProvider(cfg GoogleConfig) (*GoogleProvider, error) {
	if cfg.Client == nil {
		return nil, fmt.Errorf("tts: google client not configured")
	}
	if strings.TrimSpace(cfg.Language) == "" {
		return nil, fmt.Errorf("tts: google language not configured")
	}
	if strings.TrimSpace(cfg.VoiceName) == "" {
		return nil, fmt.Errorf("tts: google voice not configured")
	}
	if cfg.SpeakingRate <= 0 {
		return nil, fmt.Errorf("tts: google speaking rate must be greater than zero")
	}
	return &GoogleProvider{
		client:       cfg.Client,
		language:     cfg.Language,
		voiceName:    cfg.VoiceName,
		speakingRate: cfg.SpeakingRate,
	}, nil
}

// Name returns the provider identifier.
func (p *GoogleProvider) Name() string { return ProviderGoogle }

// CacheKey returns a stable fingerprint for cache entries.
func (p *GoogleProvider) CacheKey() string {
	return fmt.Sprintf("%s|%s|%s|%f", p.Name(), p.language, p.voiceName, p.speakingRate)
}

// Synthesize returns base64-encoded MP3 for the given text.
func (p *GoogleProvider) Synthesize(ctx context.Context, text string) (string, error) {
	// Bound the call like the other providers' 30s HTTP client timeout, so a
	// degraded Google TTS can't hold the request (and its server slot) until
	// the client gives up.
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	resp, err := p.client.SynthesizeSpeech(ctx, &texttospeechpb.SynthesizeSpeechRequest{
		Input: &texttospeechpb.SynthesisInput{
			InputSource: &texttospeechpb.SynthesisInput_Text{Text: text},
		},
		Voice: &texttospeechpb.VoiceSelectionParams{
			LanguageCode: p.language,
			Name:         p.voiceName,
		},
		AudioConfig: &texttospeechpb.AudioConfig{
			AudioEncoding: texttospeechpb.AudioEncoding_MP3,
			SpeakingRate:  p.speakingRate,
		},
	})
	if err != nil {
		return "", fmt.Errorf("tts: google synthesize: %w", err)
	}
	return base64.StdEncoding.EncodeToString(resp.AudioContent), nil
}

var _ Provider = (*GoogleProvider)(nil)
