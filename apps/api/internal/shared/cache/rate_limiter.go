// apps/api/internal/shared/cache/rate_limiter.go
package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// redisCommands is the subset of *redis.Client used by RedisRateLimiter,
// narrowed to an interface so tests can inject failures on individual
// commands without a real Redis server.
type redisCommands interface {
	SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.BoolCmd
	Incr(ctx context.Context, key string) *redis.IntCmd
}

// RedisRateLimiter implements middleware.RateLimiter with a Redis fixed
// window counter. It satisfies that interface structurally, so this
// package doesn't need to import middleware.
type RedisRateLimiter struct {
	client redisCommands
}

func NewRedisRateLimiter(client *redis.Client) *RedisRateLimiter {
	if client == nil {
		return &RedisRateLimiter{}
	}
	return &RedisRateLimiter{client: client}
}

// Allow reports whether a request under key is within the max/window fixed
// window limit. The counter's TTL is established via SETNX at key-creation
// time, atomically with the key's existence, rather than in a separate
// EXPIRE call after INCR. That closes the window the old
// INCR-then-EXPIRE sequence had: if the network blipped between the two
// calls, the counter key could be left with no TTL at all and would then
// increment forever, eventually blocking the client permanently once it
// crossed max. With SETNX, an INCR failure after key creation can't strand
// an un-expiring key — the TTL was already committed when the key was
// created.
func (r *RedisRateLimiter) Allow(ctx context.Context, key string, max int, window time.Duration) (bool, error) {
	if r.client == nil {
		return true, nil
	}
	redisKey := "ratelimit:" + key
	if err := r.client.SetNX(ctx, redisKey, 0, window).Err(); err != nil {
		return true, err
	}
	count, err := r.client.Incr(ctx, redisKey).Result()
	if err != nil {
		return true, err
	}
	return count <= int64(max), nil
}
