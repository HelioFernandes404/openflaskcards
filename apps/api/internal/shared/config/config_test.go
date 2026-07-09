// apps/api/internal/shared/config/config_test.go
package config

import (
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test")
	t.Setenv("JWT_SECRET", "this-is-a-very-long-secret-key-min-32")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != 3030 {
		t.Errorf("Port: got %d, want 3030", cfg.Port)
	}
	if cfg.AccessTokenTTLMinutes != 60 {
		t.Errorf("AccessTokenTTLMinutes: got %d, want 60", cfg.AccessTokenTTLMinutes)
	}
	if cfg.RefreshTokenTTLDays != 30 {
		t.Errorf("RefreshTokenTTLDays: got %d, want 30", cfg.RefreshTokenTTLDays)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Errorf("TrustedProxies: got %v, want empty (no proxy trusted by default)", cfg.TrustedProxies)
	}
}

func TestLoadParsesTrustedProxiesFromEnv(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test")
	t.Setenv("JWT_SECRET", "this-is-a-very-long-secret-key-min-32")
	t.Setenv("TRUSTED_PROXIES", "10.0.0.1,172.16.0.0/12")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := []string{"10.0.0.1", "172.16.0.0/12"}
	if len(cfg.TrustedProxies) != len(want) {
		t.Fatalf("TrustedProxies: got %v, want %v", cfg.TrustedProxies, want)
	}
	for i, v := range want {
		if cfg.TrustedProxies[i] != v {
			t.Errorf("TrustedProxies[%d]: got %q, want %q", i, cfg.TrustedProxies[i], v)
		}
	}
}

func TestRejectsShortJWTSecret(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test")
	t.Setenv("JWT_SECRET", "short")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for short JWT_SECRET, got nil")
	}
}
