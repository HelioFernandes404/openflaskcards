package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// TTSStatusChecker reports the health of the active TTS provider without
// making a network call (e.g. based on a circuit breaker's state).
type TTSStatusChecker interface {
	Status() string
}

type HealthDeps struct {
	Pool  *pgxpool.Pool
	Redis *redis.Client
	TTS   TTSStatusChecker
}

func HealthCheck(deps HealthDeps) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		checks := gin.H{}
		healthy := true

		if err := deps.Pool.Ping(ctx); err != nil {
			healthy = false
			checks["database"] = "unhealthy"
		} else {
			checks["database"] = "ok"
		}

		if deps.Redis != nil {
			if err := deps.Redis.Ping(ctx).Err(); err != nil {
				checks["redis"] = "unhealthy"
			} else {
				checks["redis"] = "ok"
			}
		} else {
			checks["redis"] = "unavailable"
		}

		if deps.TTS != nil {
			// Degraded TTS is signaled in the payload but does not flip the
			// endpoint to unhealthy: audio generation failing is not as
			// severe as losing the database/cache, and callers can decide
			// how to react to a "degraded" tts check.
			checks["tts"] = deps.TTS.Status()
		} else {
			checks["tts"] = "unavailable"
		}

		status := "ok"
		code := http.StatusOK
		if !healthy {
			status = "degraded"
			code = http.StatusServiceUnavailable
		}

		c.JSON(code, gin.H{"status": status, "checks": checks})
	}
}
