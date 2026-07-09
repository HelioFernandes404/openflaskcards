package tts

import (
	"context"
	"errors"
	"math"
	"net"
	"sync"
	"time"
)

// upstreamError carries the HTTP status code returned by a TTS provider so
// callers can decide whether a failure is worth retrying (timeouts, 5xx)
// versus a permanent client error (4xx).
type upstreamError struct {
	statusCode int
	err        error
}

func (e *upstreamError) Error() string { return e.err.Error() }
func (e *upstreamError) Unwrap() error { return e.err }

// isTransient reports whether err represents a transient failure worth
// retrying: network errors, context deadline exceeded, or an upstream 5xx.
func isTransient(err error) bool {
	if err == nil {
		return false
	}
	var upstream *upstreamError
	if errors.As(err, &upstream) {
		return upstream.statusCode >= 500
	}
	var netErr net.Error
	if errors.As(err, &netErr) {
		return true
	}
	return errors.Is(err, context.DeadlineExceeded)
}

// retryConfig controls the exponential backoff used for transient TTS
// provider failures.
type retryConfig struct {
	maxAttempts int
	baseDelay   time.Duration
}

var defaultRetryConfig = retryConfig{maxAttempts: 3, baseDelay: 200 * time.Millisecond}

// withRetry calls fn, retrying with exponential backoff when the returned
// error is transient (timeout or 5xx). Non-transient errors and success
// return immediately.
func withRetry(ctx context.Context, cfg retryConfig, fn func() (string, error)) (string, error) {
	if cfg.maxAttempts < 1 {
		cfg.maxAttempts = 1
	}
	var lastErr error
	for attempt := 0; attempt < cfg.maxAttempts; attempt++ {
		result, err := fn()
		if err == nil {
			return result, nil
		}
		lastErr = err
		if !isTransient(err) || attempt == cfg.maxAttempts-1 {
			return "", err
		}
		delay := time.Duration(math.Pow(2, float64(attempt))) * cfg.baseDelay
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(delay):
		}
	}
	return "", lastErr
}

// breakerState identifies the current state of a circuitBreaker.
type breakerState int

const (
	breakerClosed breakerState = iota
	breakerOpen
)

// circuitBreaker is a small consecutive-failure breaker for a single TTS
// provider: after failureThreshold consecutive failures it stops allowing
// calls for cooldown, then allows a single trial call (half-open) before
// closing again on success.
type circuitBreaker struct {
	mu               sync.Mutex
	failureThreshold int
	cooldown         time.Duration
	consecutiveFails int
	state            breakerState
	openedAt         time.Time
}

func newCircuitBreaker(failureThreshold int, cooldown time.Duration) *circuitBreaker {
	if failureThreshold < 1 {
		failureThreshold = 1
	}
	return &circuitBreaker{failureThreshold: failureThreshold, cooldown: cooldown}
}

// allow reports whether a call should be attempted right now.
func (b *circuitBreaker) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.state == breakerClosed {
		return true
	}
	// Open: allow a single trial call once the cooldown has elapsed.
	return time.Since(b.openedAt) >= b.cooldown
}

func (b *circuitBreaker) recordSuccess() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.consecutiveFails = 0
	b.state = breakerClosed
}

func (b *circuitBreaker) recordFailure() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.consecutiveFails++
	if b.consecutiveFails >= b.failureThreshold {
		b.state = breakerOpen
		b.openedAt = time.Now()
	}
}

// status returns a human-readable state for health reporting: "ok" when
// closed, "degraded" when open (provider is failing consistently).
func (b *circuitBreaker) status() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.state == breakerOpen {
		return "degraded"
	}
	return "ok"
}

var errCircuitOpen = errors.New("tts: circuit breaker open, provider failing consistently")
