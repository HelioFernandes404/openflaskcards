// apps/api/internal/shared/cache/rate_limiter.go
package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisRateLimiter implements middleware.RateLimiter with a Redis fixed
// window counter (INCR + EXPIRE on first hit). It satisfies that interface
// structurally, so this package doesn't need to import middleware.
type RedisRateLimiter struct {
	client *redis.Client
}

func NewRedisRateLimiter(client *redis.Client) *RedisRateLimiter {
	return &RedisRateLimiter{client: client}
}

func (r *RedisRateLimiter) Allow(ctx context.Context, key string, max int, window time.Duration) (bool, error) {
	if r.client == nil {
		return true, nil
	}
	redisKey := "ratelimit:" + key
	count, err := r.client.Incr(ctx, redisKey).Result()
	if err != nil {
		return true, err
	}
	if count == 1 {
		if err := r.client.Expire(ctx, redisKey, window).Err(); err != nil {
			return true, err
		}
	}
	return count <= int64(max), nil
}
