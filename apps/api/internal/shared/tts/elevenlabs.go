package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const elevenLabsDefaultBaseURL = "https://api.elevenlabs.io"
const elevenLabsDefaultOutputFormat = "mp3_44100_128"

// ElevenLabsConfig configures the ElevenLabs TTS provider.
type ElevenLabsConfig struct {
	APIKey  string
	VoiceID string
	ModelID string
	BaseURL string
	Client  *http.Client
	Timeout time.Duration

	Stability       float64
	SimilarityBoost float64
	Style           float64
	UseSpeakerBoost bool
	Speed           float64
	OutputFormat    string
}

// ElevenLabsProvider synthesizes text through the ElevenLabs HTTP API.
type ElevenLabsProvider struct {
	client  *http.Client
	baseURL string
	apiKey  string
	voiceID string
	modelID string

	stability       float64
	similarityBoost float64
	style           float64
	useSpeakerBoost bool
	speed           float64
	outputFormat    string

	cacheKey string
}

// NewElevenLabsProvider validates and creates an ElevenLabs provider.
func NewElevenLabsProvider(cfg ElevenLabsConfig) (*ElevenLabsProvider, error) {
	if strings.TrimSpace(cfg.APIKey) == "" {
		return nil, fmt.Errorf("tts: elevenlabs api key not configured")
	}
	if strings.TrimSpace(cfg.VoiceID) == "" {
		return nil, fmt.Errorf("tts: elevenlabs voice id not configured")
	}
	if strings.TrimSpace(cfg.ModelID) == "" {
		return nil, fmt.Errorf("tts: elevenlabs model id not configured")
	}
	baseURL := strings.TrimSpace(cfg.BaseURL)
	if baseURL == "" {
		baseURL = elevenLabsDefaultBaseURL
	}
	client := cfg.Client
	if client == nil {
		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = 30 * time.Second
		}
		client = &http.Client{Timeout: timeout}
	}
	outputFormat := strings.TrimSpace(cfg.OutputFormat)
	if outputFormat == "" {
		outputFormat = elevenLabsDefaultOutputFormat
	}
	p := &ElevenLabsProvider{
		client:          client,
		baseURL:         strings.TrimRight(baseURL, "/"),
		apiKey:          cfg.APIKey,
		voiceID:         cfg.VoiceID,
		modelID:         cfg.ModelID,
		stability:       cfg.Stability,
		similarityBoost: cfg.SimilarityBoost,
		style:           cfg.Style,
		useSpeakerBoost: cfg.UseSpeakerBoost,
		speed:           cfg.Speed,
		outputFormat:    outputFormat,
	}
	p.cacheKey = fmt.Sprintf("%s|%s|%s|%s|%s|%.2f|%.2f|%.2f|%.2f|%t",
		p.Name(), p.baseURL, p.voiceID, p.modelID, p.outputFormat,
		p.stability, p.similarityBoost, p.style, p.speed, p.useSpeakerBoost)
	return p, nil
}

// Name returns the provider identifier.
func (p *ElevenLabsProvider) Name() string { return ProviderElevenLabs }

// CacheKey returns a stable fingerprint for cache entries, precomputed at
// construction since the provider config is immutable.
func (p *ElevenLabsProvider) CacheKey() string { return p.cacheKey }

// Synthesize returns a base64 payload or URL, depending on the upstream response.
func (p *ElevenLabsProvider) Synthesize(ctx context.Context, text string) (string, error) {
	requestBody := map[string]any{
		"text":     text,
		"model_id": p.modelID,
		"voice_settings": map[string]any{
			"stability":         p.stability,
			"similarity_boost":  p.similarityBoost,
			"style":             p.style,
			"use_speaker_boost": p.useSpeakerBoost,
			"speed":             p.speed,
		},
	}
	body, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("tts: elevenlabs encode request: %w", err)
	}
	endpoint := fmt.Sprintf("%s/v1/text-to-speech/%s?output_format=%s",
		p.baseURL, url.PathEscape(p.voiceID), url.QueryEscape(p.outputFormat))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("tts: elevenlabs request: %w", err)
	}
	req.Header.Set("xi-api-key", p.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg, application/json")
	resp, err := p.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("tts: elevenlabs call: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", errorFromResponse(resp)
	}
	return decodeSynthesizedPayload(resp)
}

var _ Provider = (*ElevenLabsProvider)(nil)
