package tts

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const piperDefaultPath = "/synthesize"

// PiperConfig configures the HTTP-based Piper TTS provider.
type PiperConfig struct {
	BaseURL string
	Path    string
	Token   string
	Voice   string
	Model   string
	Client  *http.Client
	Timeout time.Duration
}

// PiperProvider synthesizes text through an external HTTP backend.
type PiperProvider struct {
	client  *http.Client
	baseURL string
	path    string
	token   string
	voice   string
	model   string
}

// NewPiperProvider validates and creates a Piper HTTP provider.
func NewPiperProvider(cfg PiperConfig) (*PiperProvider, error) {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	if baseURL == "" {
		return nil, fmt.Errorf("tts: tts_piper base url not configured")
	}
	path := strings.TrimSpace(cfg.Path)
	if path == "" {
		path = piperDefaultPath
	}
	client := cfg.Client
	if client == nil {
		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = 30 * time.Second
		}
		client = &http.Client{Timeout: timeout}
	}
	return &PiperProvider{
		client:  client,
		baseURL: strings.TrimRight(baseURL, "/"),
		path:    "/" + strings.TrimLeft(path, "/"),
		token:   strings.TrimSpace(cfg.Token),
		voice:   strings.TrimSpace(cfg.Voice),
		model:   strings.TrimSpace(cfg.Model),
	}, nil
}

// Name returns the provider identifier.
func (p *PiperProvider) Name() string { return ProviderTTSPiper }

// CacheKey returns a stable fingerprint for cache entries.
func (p *PiperProvider) CacheKey() string {
	return fmt.Sprintf("%s|%s|%s|%s|%s", p.Name(), p.baseURL, p.path, p.voice, p.model)
}

// Synthesize returns a base64 payload or URL, depending on the upstream response.
func (p *PiperProvider) Synthesize(ctx context.Context, text string) (string, error) {
	requestBody := map[string]any{"text": text}
	if p.voice != "" {
		requestBody["voice"] = p.voice
	}
	if p.model != "" {
		requestBody["model"] = p.model
	}
	body, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("tts: tts_piper encode request: %w", err)
	}
	endpoint := p.baseURL + p.path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("tts: tts_piper request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg, application/json, text/plain")
	if p.token != "" {
		req.Header.Set("Authorization", "Bearer "+p.token)
	}
	resp, err := p.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("tts: tts_piper call: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", errorFromResponse(resp)
	}
	return decodeSynthesizedPayload(resp)
}

var _ Provider = (*PiperProvider)(nil)
