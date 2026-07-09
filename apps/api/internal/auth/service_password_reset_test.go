package auth

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
)

type sentEmail struct {
	to, subject, body string
}

type fakeMailer struct {
	mu   sync.Mutex
	sent []sentEmail
}

func (f *fakeMailer) Send(_ context.Context, to, subject, body string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.sent = append(f.sent, sentEmail{to: to, subject: subject, body: body})
	return nil
}

func (f *fakeMailer) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.sent)
}

func (f *fakeMailer) last() sentEmail {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.sent[len(f.sent)-1]
}

func newTestServiceWithMailer() (*Service, *fakeMailer) {
	jwtMgr := NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	mailer := &fakeMailer{}
	svc := NewService(newFakeRepo(), jwtMgr, 30,
		WithPasswordReset(mailer, "http://localhost:5173", 30*time.Minute),
	)
	return svc, mailer
}

func TestRequestPasswordResetSendsEmailForExistingUser(t *testing.T) {
	svc, mailer := newTestServiceWithMailer()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")

	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); err != nil {
		t.Fatalf("RequestPasswordReset: %v", err)
	}
	if mailer.count() != 1 {
		t.Fatalf("expected exactly 1 email sent, got %d", mailer.count())
	}
	if mailer.last().to != "a@b.com" {
		t.Errorf("email To: got %q, want %q", mailer.last().to, "a@b.com")
	}
}

// TestRequestPasswordResetDoesNotLeakAccountExistence is the enumeration
// protection the issue calls for: an unknown email must behave exactly like
// a known one from the caller's point of view (nil error, no email sent).
func TestRequestPasswordResetDoesNotLeakAccountExistence(t *testing.T) {
	svc, mailer := newTestServiceWithMailer()

	if err := svc.RequestPasswordReset(context.Background(), "nobody@example.com"); err != nil {
		t.Fatalf("expected nil error for an unknown email, got %v", err)
	}
	if mailer.count() != 0 {
		t.Errorf("expected no email sent for an unknown email, got %d", mailer.count())
	}
}

func TestResetPasswordChangesPasswordAndRevokesSessions(t *testing.T) {
	svc, mailer := newTestServiceWithMailer()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "old-password",
	}, "")
	loginTok, err := svc.Login(context.Background(), "a@b.com", "old-password", "device-1")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}

	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); err != nil {
		t.Fatalf("RequestPasswordReset: %v", err)
	}
	rawToken := extractToken(mailer.last().body)
	if rawToken == "" {
		t.Fatalf("could not extract reset token from email body: %q", mailer.last().body)
	}

	if err := svc.ResetPassword(context.Background(), rawToken, "new-password"); err != nil {
		t.Fatalf("ResetPassword: %v", err)
	}

	// Old password must no longer work.
	if _, err := svc.Login(context.Background(), "a@b.com", "old-password", ""); err != apperror.ErrInvalidCredentials {
		t.Errorf("expected old password to be rejected, got %v", err)
	}
	// New password must work.
	if _, err := svc.Login(context.Background(), "a@b.com", "new-password", ""); err != nil {
		t.Errorf("expected new password to work, got %v", err)
	}
	// The session that existed before the reset must be revoked.
	if _, err := svc.Refresh(context.Background(), loginTok.RefreshToken); err != apperror.ErrInvalidToken {
		t.Errorf("expected pre-reset session to be revoked, got %v", err)
	}
}

func TestResetPasswordRejectsUnknownToken(t *testing.T) {
	svc, _ := newTestServiceWithMailer()
	err := svc.ResetPassword(context.Background(), "not-a-real-token", "new-password")
	if err != apperror.ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}

func TestResetPasswordRejectsExpiredToken(t *testing.T) {
	svc, mailer := newTestServiceWithMailer()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "old-password",
	}, "")
	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); err != nil {
		t.Fatalf("RequestPasswordReset: %v", err)
	}
	rawToken := extractToken(mailer.last().body)

	repo := svc.repo.(*fakeRepo)
	hash := HashRefreshToken(rawToken)
	rec := repo.resetTokens[hash]
	rec.ExpiresAt = time.Now().UTC().Add(-time.Minute)
	repo.resetTokens[hash] = rec

	err := svc.ResetPassword(context.Background(), rawToken, "new-password")
	if err != apperror.ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken for expired token, got %v", err)
	}
}

func TestResetPasswordRejectsAlreadyUsedToken(t *testing.T) {
	svc, mailer := newTestServiceWithMailer()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "old-password",
	}, "")
	if err := svc.RequestPasswordReset(context.Background(), "a@b.com"); err != nil {
		t.Fatalf("RequestPasswordReset: %v", err)
	}
	rawToken := extractToken(mailer.last().body)

	if err := svc.ResetPassword(context.Background(), rawToken, "new-password"); err != nil {
		t.Fatalf("first ResetPassword: %v", err)
	}
	err := svc.ResetPassword(context.Background(), rawToken, "another-password")
	if err != apperror.ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken when reusing an already-used token, got %v", err)
	}
}

// extractToken pulls the token query param out of the reset link embedded in
// the email body built by RequestPasswordReset.
func extractToken(body string) string {
	const marker = "token="
	idx := indexOf(body, marker)
	if idx == -1 {
		return ""
	}
	rest := body[idx+len(marker):]
	end := len(rest)
	for i, c := range rest {
		if c == '\n' || c == ' ' {
			end = i
			break
		}
	}
	return rest[:end]
}

func indexOf(s, substr string) int {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}
