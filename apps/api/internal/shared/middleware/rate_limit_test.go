package middleware

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

// fakeRateLimiter is an in-memory stand-in for the Redis-backed limiter,
// so the middleware's request handling can be tested without a real Redis.
type fakeRateLimiter struct {
	counts  map[string]int
	failErr error
}

func newFakeRateLimiter() *fakeRateLimiter {
	return &fakeRateLimiter{counts: make(map[string]int)}
}

func (f *fakeRateLimiter) Allow(_ context.Context, key string, max int, _ time.Duration) (bool, error) {
	if f.failErr != nil {
		return false, f.failErr
	}
	f.counts[key]++
	return f.counts[key] <= max, nil
}

func setupRateLimitedRouter(limiter RateLimiter, max int, window time.Duration) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/limited", RateLimit(limiter, max, window, ByClientIP), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return r
}

func doPost(r *gin.Engine, remoteAddr string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/limited", nil)
	req.RemoteAddr = remoteAddr
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestRateLimitAllowsRequestsUnderLimit(t *testing.T) {
	limiter := newFakeRateLimiter()
	r := setupRateLimitedRouter(limiter, 3, time.Minute)

	for i := 0; i < 3; i++ {
		w := doPost(r, "1.2.3.4:5555")
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: got %d, want 200", i, w.Code)
		}
	}
}

func TestRateLimitBlocksRequestsOverLimit(t *testing.T) {
	limiter := newFakeRateLimiter()
	r := setupRateLimitedRouter(limiter, 2, time.Minute)

	for i := 0; i < 2; i++ {
		w := doPost(r, "1.2.3.4:5555")
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: got %d, want 200", i, w.Code)
		}
	}
	w := doPost(r, "1.2.3.4:5555")
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("3rd request: got %d, want 429", w.Code)
	}
}

func TestRateLimitIsolatesByKey(t *testing.T) {
	limiter := newFakeRateLimiter()
	r := setupRateLimitedRouter(limiter, 1, time.Minute)

	if w := doPost(r, "1.1.1.1:1111"); w.Code != http.StatusOK {
		t.Fatalf("ip1 first request: got %d, want 200", w.Code)
	}
	if w := doPost(r, "1.1.1.1:1111"); w.Code != http.StatusTooManyRequests {
		t.Fatalf("ip1 second request: got %d, want 429", w.Code)
	}
	if w := doPost(r, "2.2.2.2:2222"); w.Code != http.StatusOK {
		t.Errorf("ip2 first request should be unaffected by ip1's limit: got %d, want 200", w.Code)
	}
}

func TestRateLimitFailsOpenWhenStoreErrors(t *testing.T) {
	limiter := &fakeRateLimiter{counts: map[string]int{}, failErr: errors.New("redis unavailable")}
	r := setupRateLimitedRouter(limiter, 1, time.Minute)

	w := doPost(r, "1.2.3.4:5555")
	if w.Code != http.StatusOK {
		t.Errorf("expected requests to pass through when the rate limit store errors, got %d", w.Code)
	}
}

func setupRateLimitedRouterWithTrustedProxies(limiter RateLimiter, max int, window time.Duration, trustedProxies []string) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	if err := r.SetTrustedProxies(trustedProxies); err != nil {
		panic(err)
	}
	r.POST("/limited", RateLimit(limiter, max, window, ByClientIP), func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return r
}

func doPostWithForwardedFor(r *gin.Engine, remoteAddr, forwardedFor string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/limited", nil)
	req.RemoteAddr = remoteAddr
	req.Header.Set("X-Forwarded-For", forwardedFor)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// TestRateLimitBySpoofedHeaderBypassesLimitWhenProxiesNotConfigured documents
// the vulnerability: gin's default (no SetTrustedProxies call) trusts every
// caller's X-Forwarded-For header, so ByClientIP buckets by whatever IP the
// caller claims rather than the real TCP peer.
func TestRateLimitBySpoofedHeaderBypassesLimitWhenProxiesNotConfigured(t *testing.T) {
	limiter := newFakeRateLimiter()
	r := setupRateLimitedRouter(limiter, 1, time.Minute)

	for i := 0; i < 3; i++ {
		w := doPostWithForwardedFor(r, "203.0.113.9:5555", fmt.Sprintf("10.0.0.%d", i))
		if w.Code != http.StatusOK {
			t.Fatalf("request %d with spoofed X-Forwarded-For: got %d, want 200 (bucket should differ each time)", i, w.Code)
		}
	}
}

// TestAuthRateLimitKeyedByRealIPNotSpoofableHeader is the fix this middleware
// relies on cmd/api/main.go to apply: once SetTrustedProxies(nil) is set (no
// proxy is trusted), ClientIP() ignores X-Forwarded-For entirely and always
// reflects the real TCP peer, so a spoofed header can no longer mint a fresh
// rate-limit bucket per request.
func TestAuthRateLimitKeyedByRealIPNotSpoofableHeader(t *testing.T) {
	limiter := newFakeRateLimiter()
	r := setupRateLimitedRouterWithTrustedProxies(limiter, 2, time.Minute, nil)

	for i := 0; i < 2; i++ {
		w := doPostWithForwardedFor(r, "203.0.113.9:5555", fmt.Sprintf("10.0.0.%d", i))
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: got %d, want 200", i, w.Code)
		}
	}
	w := doPostWithForwardedFor(r, "203.0.113.9:5555", "10.0.0.99")
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("3rd request with a new spoofed X-Forwarded-For: got %d, want 429 (real peer IP should still be rate limited)", w.Code)
	}
}
