package middleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RateLimiter tracks request counts per key within a sliding window. Allow
// increments the counter for key and reports whether the request is still
// within max for the given window.
type RateLimiter interface {
	Allow(ctx context.Context, key string, max int, window time.Duration) (bool, error)
}

// ByClientIP buckets requests by the caller's IP address.
func ByClientIP(c *gin.Context) string {
	return c.ClientIP()
}

// ByUserID buckets requests by the authenticated user's ID, falling back to
// the client IP if no user is set on the context (e.g. route not behind auth
// middleware). Used for quotas that must hold per-account regardless of how
// many IPs a user requests from — e.g. paid third-party API calls.
func ByUserID(c *gin.Context) string {
	if uid, ok := c.Get("userID"); ok {
		if s, ok := uid.(fmt.Stringer); ok {
			return s.String()
		}
		return fmt.Sprintf("%v", uid)
	}
	return c.ClientIP()
}

// RateLimit throttles requests to max per window, keyed by keyFunc. If the
// backing store errors (e.g. Redis is unreachable), requests are allowed
// through rather than blocking the whole route — matching how the rest of
// the API already degrades when Redis is unavailable.
func RateLimit(limiter RateLimiter, max int, window time.Duration, keyFunc func(c *gin.Context) string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.FullPath() + ":" + keyFunc(c)
		allowed, err := limiter.Allow(c.Request.Context(), key, max, window)
		if err != nil {
			reqLog := Logger(c).With(zap.String("rate_limit_key", key))
			reqLog.Warn("rate limiter store error, allowing request through", zap.Error(err))
			c.Next()
			return
		}
		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"code":    "RATE_LIMITED",
				"message": "too many requests, try again later",
			})
			return
		}
		c.Next()
	}
}
