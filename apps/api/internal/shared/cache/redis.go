// apps/api/internal/shared/cache/redis.go
package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedis(ctx context.Context, host string, port int, db int) (*redis.Client, error) {
	// Short explicit timeouts: Redis backs the auth rate limiter and TTS
	// cache, both on the request path — a slow Redis must fail fast into
	// each caller's degraded mode instead of adding tail latency to every
	// request.
	client := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", host, port),
		DB:           db,
		DialTimeout:  2 * time.Second,
		ReadTimeout:  500 * time.Millisecond,
		WriteTimeout: 500 * time.Millisecond,
	})
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis: ping: %w", err)
	}
	return client, nil
}
