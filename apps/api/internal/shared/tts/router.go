package tts

import (
	"fmt"
	"strings"
)

const (
	ProviderGoogle     = "google"
	ProviderElevenLabs = "elevenlabs"
	ProviderTTSPiper   = "tts_piper"
)

func newProvider(cfg Config) (Provider, error) {
	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "", ProviderGoogle:
		return NewGoogleProvider(cfg.Google)
	case ProviderElevenLabs:
		return NewElevenLabsProvider(cfg.ElevenLabs)
	case ProviderTTSPiper:
		return NewPiperProvider(cfg.Piper)
	default:
		return nil, fmt.Errorf("tts: unknown provider %q", cfg.Provider)
	}
}
