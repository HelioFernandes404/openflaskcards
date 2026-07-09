package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

type fakeRepo struct {
	users  map[string]User
	tokens map[string]RefreshTokenRecord
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		users:  make(map[string]User),
		tokens: make(map[string]RefreshTokenRecord),
	}
}

func (f *fakeRepo) CreateUser(_ context.Context, p CreateUserParams) (User, error) {
	if _, ok := f.users[p.Email]; ok {
		return User{}, apperror.ErrUserAlreadyExists
	}
	u := User{
		ID:               uuid.New(),
		Email:            p.Email,
		Nickname:         p.Nickname,
		Name:             p.Name,
		HashedPassword:   p.HashedPassword,
		FSRSParameters:   p.FSRSParameters,
		DesiredRetention: p.DesiredRetention,
		CreatedAt:        "2025-01-01T00:00:00Z",
		UpdatedAt:        "2025-01-01T00:00:00Z",
	}
	f.users[p.Email] = u
	return u, nil
}
func (f *fakeRepo) GetUserByEmail(_ context.Context, email string) (User, error) {
	u, ok := f.users[email]
	if !ok {
		return User{}, apperror.ErrUserNotFound
	}
	return u, nil
}
func (f *fakeRepo) GetUserByID(_ context.Context, id uuid.UUID) (User, error) {
	for _, u := range f.users {
		if u.ID == id {
			return u, nil
		}
	}
	return User{}, apperror.ErrUserNotFound
}
func (f *fakeRepo) CreateRefreshToken(_ context.Context, p CreateRefreshTokenParams) error {
	f.tokens[p.TokenHash] = RefreshTokenRecord{UserID: p.UserID, TokenHash: p.TokenHash, ExpiresAt: p.ExpiresAt}
	return nil
}
func (f *fakeRepo) GetRefreshToken(_ context.Context, hash string) (RefreshTokenRecord, error) {
	rec, ok := f.tokens[hash]
	if !ok {
		return RefreshTokenRecord{}, apperror.ErrInvalidToken
	}
	return rec, nil
}
func (f *fakeRepo) DeleteRefreshToken(_ context.Context, hash string) error {
	delete(f.tokens, hash)
	return nil
}
func (f *fakeRepo) DeleteAllRefreshTokensForUser(_ context.Context, userID uuid.UUID) error {
	for k, v := range f.tokens {
		if v.UserID == userID {
			delete(f.tokens, k)
		}
	}
	return nil
}
func (f *fakeRepo) RotateRefreshToken(_ context.Context, oldHash string, p CreateRefreshTokenParams) error {
	if _, ok := f.tokens[oldHash]; !ok {
		return apperror.ErrInvalidToken
	}
	delete(f.tokens, oldHash)
	f.tokens[p.TokenHash] = RefreshTokenRecord{UserID: p.UserID, TokenHash: p.TokenHash, ExpiresAt: p.ExpiresAt}
	return nil
}

// failingRotateRepo simulates a rotation that fails atomically (e.g. a
// transaction rollback): the old token must remain untouched.
type failingRotateRepo struct {
	*fakeRepo
}

func (f *failingRotateRepo) RotateRefreshToken(_ context.Context, _ string, _ CreateRefreshTokenParams) error {
	return errors.New("rotate failed")
}

func newTestService() *Service {
	jwtMgr := NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	return NewService(newFakeRepo(), jwtMgr, 30)
}

func TestRegisterCreatesUser(t *testing.T) {
	svc := newTestService()
	u, _, err := svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Name: "A", Password: "supersecretpass",
	}, "")
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if u.Email != "a@b.com" {
		t.Errorf("Email: got %q, want %q", u.Email, "a@b.com")
	}
}

func TestRegisterReturnsTokens(t *testing.T) {
	svc := newTestService()
	_, tok, err := svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "test-device")
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if tok.AccessToken == "" || tok.RefreshToken == "" {
		t.Error("expected Register to return a non-empty token pair, so a new user is logged in immediately")
	}
}

func TestLoginReturnsTokens(t *testing.T) {
	svc := newTestService()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	tok, err := svc.Login(context.Background(), "a@b.com", "supersecretpass", "test-device")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	if tok.AccessToken == "" || tok.RefreshToken == "" {
		t.Error("expected non-empty tokens")
	}
}

func TestLoginRejectsBadPassword(t *testing.T) {
	svc := newTestService()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	_, err := svc.Login(context.Background(), "a@b.com", "wrongpass", "")
	if err != apperror.ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestRegisterRejectsDuplicateEmail(t *testing.T) {
	svc := newTestService()
	input := RegisterInput{Email: "a@b.com", Nickname: "ab", Password: "supersecretpass"}
	_, _, _ = svc.Register(context.Background(), input, "")
	_, _, err := svc.Register(context.Background(), input, "")
	if err != apperror.ErrUserAlreadyExists {
		t.Errorf("expected ErrUserAlreadyExists, got %v", err)
	}
}

func TestRefreshRotatesTokens(t *testing.T) {
	svc := newTestService()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	first, err := svc.Login(context.Background(), "a@b.com", "supersecretpass", "")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}
	second, err := svc.Refresh(context.Background(), first.RefreshToken)
	if err != nil {
		t.Fatalf("Refresh: %v", err)
	}
	if second.AccessToken == "" || second.RefreshToken == "" {
		t.Error("Refresh: expected non-empty tokens")
	}
	if second.RefreshToken == first.RefreshToken {
		t.Error("Refresh: token should be rotated, got same token")
	}
}

func TestRefreshRejectsExpiredToken(t *testing.T) {
	svc := newTestService()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	tok, _ := svc.Login(context.Background(), "a@b.com", "supersecretpass", "")

	// Manually expire the token in the fake repo by overwriting it.
	hash := HashRefreshToken(tok.RefreshToken)
	repo := svc.repo.(*fakeRepo)
	rec := repo.tokens[hash]
	rec.ExpiresAt = time.Now().UTC().Add(-time.Hour)
	repo.tokens[hash] = rec

	_, err := svc.Refresh(context.Background(), tok.RefreshToken)
	if err != apperror.ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken for expired token, got %v", err)
	}
}

func TestRefreshRejectsUnknownToken(t *testing.T) {
	svc := newTestService()
	_, err := svc.Refresh(context.Background(), "not-a-real-token")
	if err != apperror.ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken for unknown token, got %v", err)
	}
}

func TestRefreshPropagatesRotationError(t *testing.T) {
	base := newFakeRepo()
	jwtMgr := NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	svc := NewService(base, jwtMgr, 30)
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	first, err := svc.Login(context.Background(), "a@b.com", "supersecretpass", "")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}

	svc.repo = &failingRotateRepo{fakeRepo: base}
	_, err = svc.Refresh(context.Background(), first.RefreshToken)
	if err == nil {
		t.Fatal("expected Refresh to fail when rotation cannot be persisted, got nil error")
	}
	if _, ok := base.tokens[HashRefreshToken(first.RefreshToken)]; !ok {
		t.Error("expected old refresh token to remain valid after a failed atomic rotation, but it was deleted")
	}
}

func TestLogoutRevokesRefreshToken(t *testing.T) {
	svc := newTestService()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	tok, err := svc.Login(context.Background(), "a@b.com", "supersecretpass", "")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}

	if err := svc.Logout(context.Background(), tok.RefreshToken); err != nil {
		t.Fatalf("Logout: %v", err)
	}

	_, err = svc.Refresh(context.Background(), tok.RefreshToken)
	if err != apperror.ErrInvalidToken {
		t.Errorf("expected refresh with a logged-out token to fail with ErrInvalidToken, got %v", err)
	}
}

func TestLogoutWithEmptyTokenIsNoOp(t *testing.T) {
	svc := newTestService()
	if err := svc.Logout(context.Background(), ""); err != nil {
		t.Errorf("expected Logout with empty token to succeed as a no-op, got %v", err)
	}
}

func TestLogoutAllRevokesEverySessionOfTheUser(t *testing.T) {
	svc := newTestService()
	u, _, _ := svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	first, _ := svc.Login(context.Background(), "a@b.com", "supersecretpass", "device-1")
	second, _ := svc.Login(context.Background(), "a@b.com", "supersecretpass", "device-2")

	if err := svc.LogoutAll(context.Background(), u.ID); err != nil {
		t.Fatalf("LogoutAll: %v", err)
	}

	if _, err := svc.Refresh(context.Background(), first.RefreshToken); err != apperror.ErrInvalidToken {
		t.Errorf("device-1 session: expected ErrInvalidToken after LogoutAll, got %v", err)
	}
	if _, err := svc.Refresh(context.Background(), second.RefreshToken); err != apperror.ErrInvalidToken {
		t.Errorf("device-2 session: expected ErrInvalidToken after LogoutAll, got %v", err)
	}
}

func TestLogoutAllLeavesOtherUsersSessionsIntact(t *testing.T) {
	svc := newTestService()
	alice, _, _ := svc.Register(context.Background(), RegisterInput{
		Email: "alice@b.com", Nickname: "alice", Password: "supersecretpass",
	}, "")
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "bob@b.com", Nickname: "bob", Password: "supersecretpass",
	}, "")
	bobTok, _ := svc.Login(context.Background(), "bob@b.com", "supersecretpass", "")

	if err := svc.LogoutAll(context.Background(), alice.ID); err != nil {
		t.Fatalf("LogoutAll: %v", err)
	}

	if _, err := svc.Refresh(context.Background(), bobTok.RefreshToken); err != nil {
		t.Errorf("expected bob's session to survive alice's LogoutAll, got %v", err)
	}
}

func TestRegisterNormalizesEmailToLowercase(t *testing.T) {
	svc := newTestService()
	u, _, err := svc.Register(context.Background(), RegisterInput{
		Email: "  Foo@EXAMPLE.com  ", Nickname: "foo", Password: "supersecretpass",
	}, "")
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	if u.Email != "foo@example.com" {
		t.Errorf("Email: got %q, want normalized %q", u.Email, "foo@example.com")
	}
}

func TestRegisterRejectsDuplicateEmailDifferingOnlyByCase(t *testing.T) {
	svc := newTestService()
	_, _, err := svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	if err != nil {
		t.Fatalf("first Register: %v", err)
	}
	_, _, err = svc.Register(context.Background(), RegisterInput{
		Email: "A@B.com", Nickname: "ab2", Password: "supersecretpass",
	}, "")
	if err != apperror.ErrUserAlreadyExists {
		t.Errorf("expected ErrUserAlreadyExists for an email differing only by case, got %v", err)
	}
}

func TestLoginIsCaseInsensitiveOnEmail(t *testing.T) {
	svc := newTestService()
	_, _, err := svc.Register(context.Background(), RegisterInput{
		Email: "foo@example.com", Nickname: "foo", Password: "supersecretpass",
	}, "")
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	tok, err := svc.Login(context.Background(), "  FOO@Example.COM  ", "supersecretpass", "")
	if err != nil {
		t.Fatalf("expected Login to succeed with a differently-cased/whitespace-padded email, got %v", err)
	}
	if tok.AccessToken == "" {
		t.Error("expected non-empty access token")
	}
}
