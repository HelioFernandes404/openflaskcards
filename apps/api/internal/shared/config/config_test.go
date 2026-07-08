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
}

func TestRejectsShortJWTSecret(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test")
	t.Setenv("JWT_SECRET", "short")

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for short JWT_SECRET, got nil")
	}
}
