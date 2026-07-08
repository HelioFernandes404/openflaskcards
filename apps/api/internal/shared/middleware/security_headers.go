package middleware

import "github.com/gin-gonic/gin"

// SecurityHeaders sets a conservative set of response headers that are safe
// defaults for a JSON API with no server-rendered HTML. It intentionally
// omits Content-Security-Policy and HSTS, which need to be tuned to the
// deployment (TLS termination, allowed origins) rather than hardcoded here.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}
