package tts

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type fakeProvider struct {
	name     string
	cacheKey string
	payload  string
	calls    int
	failN    int
	failErr  error
}

func (f *fakeProvider) Name() string { return f.name }

func (f *fakeProvider) CacheKey() string { return f.cacheKey }

func (f *fakeProvider) Synthesize(_ context.Context, _ string) (string, error) {
	f.calls++
	if f.calls <= f.failN {
		return "", f.failErr
	}
	return f.payload, nil
}

func TestServiceSynthesizeDelegatesToProvider(t *testing.T) {
	provider := &fakeProvider{name: "fake", cacheKey: "fake|1", payload: "audio-payload"}
	svc := &Service{provider: provider}

	got, err := svc.Synthesize(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Synthesize failed: %v", err)
	}
	if got != "audio-payload" {
		t.Fatalf("Synthesize() = %q; want %q", got, "audio-payload")
	}
	if provider.calls != 1 {
		t.Fatalf("provider calls = %d; want 1", provider.calls)
	}
}

func TestServiceSynthesizeRetriesTransientFailure(t *testing.T) {
	provider := &fakeProvider{
		name: "fake", cacheKey: "fake|1", payload: "audio-payload",
		failN:   1,
		failErr: &upstreamError{statusCode: http.StatusServiceUnavailable, err: errors.New("upstream 503")},
	}
	svc := &Service{provider: provider, breaker: newCircuitBreaker(3, time.Minute)}

	got, err := svc.Synthesize(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Synthesize failed: %v", err)
	}
	if got != "audio-payload" {
		t.Fatalf("Synthesize() = %q; want %q", got, "audio-payload")
	}
	if provider.calls != 2 {
		t.Fatalf("provider calls = %d; want 2 (1 failure + 1 retry)", provider.calls)
	}
}

func TestServiceSynthesizeOpensCircuitAfterConsecutiveFailures(t *testing.T) {
	failErr := &upstreamError{statusCode: http.StatusServiceUnavailable, err: errors.New("upstream 503")}
	provider := &fakeProvider{name: "fake", cacheKey: "fake|1", failN: 100, failErr: failErr}
	svc := &Service{provider: provider, breaker: newCircuitBreaker(2, time.Minute)}

	for i := 0; i < 2; i++ {
		if _, err := svc.Synthesize(context.Background(), "hello"); err == nil {
			t.Fatalf("Synthesize() call %d: expected error", i)
		}
	}
	if got := svc.Status(); got != "degraded" {
		t.Fatalf("Status() = %q; want %q", got, "degraded")
	}

	callsBeforeOpenCheck := provider.calls
	if _, err := svc.Synthesize(context.Background(), "hello"); !errors.Is(err, errCircuitOpen) {
		t.Fatalf("Synthesize() error = %v; want circuit open error", err)
	}
	if provider.calls != callsBeforeOpenCheck {
		t.Fatalf("provider called while circuit open: calls = %d; want %d", provider.calls, callsBeforeOpenCheck)
	}
}

func TestNewServiceRejectsInvalidConfig(t *testing.T) {
	tests := []struct {
		name string
		cfg  Config
	}{
		{
			name: "unknown provider",
			cfg:  Config{Provider: "unknown"},
		},
		{
			name: "google without client",
			cfg: Config{
				Provider: ProviderGoogle,
				Google:   GoogleConfig{Language: "en-US", VoiceName: "en-US-Chirp3-HD-Algenib", SpeakingRate: 0.8},
			},
		},
		{
			name: "elevenlabs without api key",
			cfg: Config{
				Provider:   ProviderElevenLabs,
				ElevenLabs: ElevenLabsConfig{VoiceID: "voice", ModelID: "model", BaseURL: "https://api.elevenlabs.io"},
			},
		},
		{
			name: "piper without base url",
			cfg: Config{
				Provider: ProviderTTSPiper,
				Piper:    PiperConfig{Path: "/synthesize"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := NewService(tt.cfg); err == nil {
				t.Fatalf("NewService() error = nil; want error")
			}
		})
	}
}

func TestElevenLabsProviderSynthesize(t *testing.T) {
	var capturedBody []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got, want := r.Method, http.MethodPost; got != want {
			t.Fatalf("method = %s; want %s", got, want)
		}
		if got, want := r.URL.Path, "/v1/text-to-speech/voice-123"; got != want {
			t.Fatalf("path = %s; want %s", got, want)
		}
		if got, want := r.URL.Query().Get("output_format"), "mp3_22050_32"; got != want {
			t.Fatalf("output_format = %s; want %s", got, want)
		}
		if got, want := r.Header.Get("xi-api-key"), "secret"; got != want {
			t.Fatalf("api key = %s; want %s", got, want)
		}
		capturedBody, _ = io.ReadAll(r.Body)
		w.Header().Set("Content-Type", "audio/mpeg")
		_, _ = w.Write([]byte("mp3-bytes"))
	}))
	t.Cleanup(server.Close)

	provider, err := NewElevenLabsProvider(ElevenLabsConfig{
		APIKey:          "secret",
		VoiceID:         "voice-123",
		ModelID:         "model-abc",
		BaseURL:         server.URL,
		Client:          server.Client(),
		Timeout:         time.Second,
		Stability:       0.4,
		SimilarityBoost: 0.6,
		Style:           0.3,
		UseSpeakerBoost: false,
		Speed:           1.1,
		OutputFormat:    "mp3_22050_32",
	})
	if err != nil {
		t.Fatalf("NewElevenLabsProvider() error = %v", err)
	}

	got, err := provider.Synthesize(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Synthesize() error = %v", err)
	}
	want := base64.StdEncoding.EncodeToString([]byte("mp3-bytes"))
	if got != want {
		t.Fatalf("Synthesize() = %q; want %q", got, want)
	}

	var payload map[string]any
	if err := json.Unmarshal(capturedBody, &payload); err != nil {
		t.Fatalf("unmarshal request body: %v", err)
	}
	settings, ok := payload["voice_settings"].(map[string]any)
	if !ok {
		t.Fatalf("voice_settings missing or wrong type: %v", payload["voice_settings"])
	}
	wantSettings := map[string]float64{
		"stability":        0.4,
		"similarity_boost": 0.6,
		"style":            0.3,
		"speed":            1.1,
	}
	for key, want := range wantSettings {
		got, ok := settings[key].(float64)
		if !ok || got != want {
			t.Fatalf("voice_settings[%q] = %v; want %v", key, settings[key], want)
		}
	}
	if got, want := settings["use_speaker_boost"], false; got != want {
		t.Fatalf("voice_settings[use_speaker_boost] = %v; want %v", got, want)
	}
}

func TestElevenLabsProviderCacheKeyVariesWithSettings(t *testing.T) {
	base, err := NewElevenLabsProvider(ElevenLabsConfig{APIKey: "k", VoiceID: "v", ModelID: "m"})
	if err != nil {
		t.Fatalf("NewElevenLabsProvider() error = %v", err)
	}
	other, err := NewElevenLabsProvider(ElevenLabsConfig{APIKey: "k", VoiceID: "v", ModelID: "m", Style: 0.5})
	if err != nil {
		t.Fatalf("NewElevenLabsProvider() error = %v", err)
	}
	if base.CacheKey() == other.CacheKey() {
		t.Fatalf("CacheKey() should differ when voice settings differ")
	}
}

func TestPiperProviderSynthesize(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got, want := r.Method, http.MethodPost; got != want {
			t.Fatalf("method = %s; want %s", got, want)
		}
		if got, want := r.URL.Path, "/synthesize"; got != want {
			t.Fatalf("path = %s; want %s", got, want)
		}
		body, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(body), "hello") {
			t.Fatalf("request body = %s; want text", string(body))
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"audioUrl":"https://cdn.example/audio.mp3"}`))
	}))
	t.Cleanup(server.Close)

	provider, err := NewPiperProvider(PiperConfig{
		BaseURL: server.URL,
		Path:    "/synthesize",
		Client:  server.Client(),
		Timeout: time.Second,
	})
	if err != nil {
		t.Fatalf("NewPiperProvider() error = %v", err)
	}

	got, err := provider.Synthesize(context.Background(), "hello")
	if err != nil {
		t.Fatalf("Synthesize() error = %v", err)
	}
	if got != "https://cdn.example/audio.mp3" {
		t.Fatalf("Synthesize() = %q; want %q", got, "https://cdn.example/audio.mp3")
	}
}
