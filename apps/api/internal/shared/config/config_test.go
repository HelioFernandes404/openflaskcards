// apps/api/internal/shared/config/config_test.go
package config

import (
	"testing"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != 3030 {
		t.Errorf("Port: got %d, want 3030", cfg.Port)
	}
	if len(cfg.TrustedProxies) != 0 {
		t.Errorf("TrustedProxies: got %v, want empty (no proxy trusted by default)", cfg.TrustedProxies)
	}
}

func TestLoadParsesTrustedProxiesFromEnv(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test")
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
