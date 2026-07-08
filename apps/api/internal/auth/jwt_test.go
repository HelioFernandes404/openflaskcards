package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestJWTSignAndParse(t *testing.T) {
	secret := []byte("test-secret-test-secret-test-secret-32")
	m := NewJWTManager(secret, 15*time.Minute)

	userID := uuid.New()
	token, err := m.Sign(userID, "user@test.com")
	if err != nil {
		t.Fatalf("Sign: %v", err)
	}

	claims, err := m.Parse(token)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if claims.UserID != userID {
		t.Errorf("UserID: got %v, want %v", claims.UserID, userID)
	}
	if claims.Email != "user@test.com" {
		t.Errorf("Email: got %q, want %q", claims.Email, "user@test.com")
	}
}

func TestJWTRejectsTamperedToken(t *testing.T) {
	secret := []byte("test-secret-test-secret-test-secret-32")
	m := NewJWTManager(secret, 15*time.Minute)

	token, _ := m.Sign(uuid.New(), "u@x.com")
	tampered := token + "x"

	if _, err := m.Parse(tampered); err == nil {
		t.Fatal("expected error parsing tampered token")
	}
}

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("hunter2hunter2")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if !VerifyPassword(hash, "hunter2hunter2") {
		t.Error("expected verify to succeed")
	}
	if VerifyPassword(hash, "wrong") {
		t.Error("expected verify to fail on wrong password")
	}
}

func TestGenerateRefreshTokenAndHash(t *testing.T) {
	token, hash, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken: %v", err)
	}
	if len(token) == 0 || len(hash) != 64 {
		t.Errorf("token=%d hash=%d", len(token), len(hash))
	}
	if HashRefreshToken(token) != hash {
		t.Error("HashRefreshToken not deterministic")
	}
}
