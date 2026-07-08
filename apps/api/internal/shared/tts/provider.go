package tts

import "context"

// Provider synthesizes text into a transport payload understood by the caller.
type Provider interface {
	Name() string
	CacheKey() string
	Synthesize(ctx context.Context, text string) (string, error)
}
