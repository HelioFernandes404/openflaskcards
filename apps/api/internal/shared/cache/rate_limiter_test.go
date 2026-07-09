package cache

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func newTestRedis(t *testing.T) (*redis.Client, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { client.Close() })
	return client, mr
}

func TestAllowSetsTTLOnFirstHit(t *testing.T) {
	client, mr := newTestRedis(t)
	limiter := NewRedisRateLimiter(client)

	allowed, err := limiter.Allow(context.Background(), "login:1.2.3.4", 5, time.Minute)
	if err != nil {
		t.Fatalf("Allow: %v", err)
	}
	if !allowed {
		t.Fatal("expected first request to be allowed")
	}
	if ttl := mr.TTL("ratelimit:login:1.2.3.4"); ttl <= 0 {
		t.Fatalf("expected counter key to have a TTL set on the first hit, got %v", ttl)
	}
}

func TestAllowBlocksOverLimitAndResetsAfterWindow(t *testing.T) {
	client, mr := newTestRedis(t)
	limiter := NewRedisRateLimiter(client)
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		allowed, err := limiter.Allow(ctx, "k", 3, time.Minute)
		if err != nil || !allowed {
			t.Fatalf("request %d: allowed=%v err=%v", i, allowed, err)
		}
	}
	if allowed, err := limiter.Allow(ctx, "k", 3, time.Minute); err != nil || allowed {
		t.Fatalf("expected 4th request over limit to be blocked, got allowed=%v err=%v", allowed, err)
	}

	mr.FastForward(time.Minute + time.Second)

	if allowed, err := limiter.Allow(ctx, "k", 3, time.Minute); err != nil || !allowed {
		t.Fatalf("expected a request after the window expired to be allowed, got allowed=%v err=%v", allowed, err)
	}
}

func TestAllowIsolatesCountersByKey(t *testing.T) {
	client, _ := newTestRedis(t)
	limiter := NewRedisRateLimiter(client)
	ctx := context.Background()

	if allowed, err := limiter.Allow(ctx, "a", 1, time.Minute); err != nil || !allowed {
		t.Fatalf("key a first request: allowed=%v err=%v", allowed, err)
	}
	if allowed, err := limiter.Allow(ctx, "a", 1, time.Minute); err != nil || allowed {
		t.Fatalf("key a second request should be blocked: allowed=%v err=%v", allowed, err)
	}
	if allowed, err := limiter.Allow(ctx, "b", 1, time.Minute); err != nil || !allowed {
		t.Fatalf("key b should be unaffected by key a's limit: allowed=%v err=%v", allowed, err)
	}
}

func TestNewRedisRateLimiterWithNilClientAlwaysAllows(t *testing.T) {
	limiter := NewRedisRateLimiter(nil)
	allowed, err := limiter.Allow(context.Background(), "k", 1, time.Minute)
	if err != nil || !allowed {
		t.Fatalf("expected nil client to fail open, got allowed=%v err=%v", allowed, err)
	}
}

// flakyIncrClient wraps a real (miniredis-backed) *redis.Client but forces
// the very next Incr call to fail, simulating a transient network blip
// after the key/TTL has already been committed to Redis via SetNX.
type flakyIncrClient struct {
	*redis.Client
	failNextIncr bool
}

func (f *flakyIncrClient) Incr(ctx context.Context, key string) *redis.IntCmd {
	if f.failNextIncr {
		f.failNextIncr = false
		cmd := redis.NewIntCmd(ctx)
		cmd.SetErr(errors.New("simulated redis incr failure"))
		return cmd
	}
	return f.Client.Incr(ctx, key)
}

// TestAllowKeepsTTLWhenIncrFailsAfterKeyCreation is the regression test for
// the original bug: Allow used to INCR first and only set a TTL with a
// separate EXPIRE call when the counter had just been created. If that
// second call failed, the key was left with no expiration and would count
// requests forever, eventually blocking the client permanently. Guarding
// key-creation and TTL together in a single SETNX means a later INCR
// failure can no longer strand an un-expiring key.
func TestAllowKeepsTTLWhenIncrFailsAfterKeyCreation(t *testing.T) {
	client, mr := newTestRedis(t)
	flaky := &flakyIncrClient{Client: client, failNextIncr: true}
	limiter := &RedisRateLimiter{client: flaky}

	_, err := limiter.Allow(context.Background(), "flaky", 5, time.Minute)
	if err == nil {
		t.Fatal("expected the simulated Incr failure to surface as an error")
	}

	ttl := mr.TTL("ratelimit:flaky")
	if ttl <= 0 {
		t.Fatalf("counter key has no TTL after Incr failed (got %v) — this key would count requests forever and could permanently lock the client out", ttl)
	}
}
