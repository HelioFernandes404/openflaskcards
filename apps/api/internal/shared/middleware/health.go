package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type HealthDeps struct {
	Pool  *pgxpool.Pool
	Redis *redis.Client
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

		status := "ok"
		code := http.StatusOK
		if !healthy {
			status = "degraded"
			code = http.StatusServiceUnavailable
		}

		c.JSON(code, gin.H{"status": status, "checks": checks})
	}
}
