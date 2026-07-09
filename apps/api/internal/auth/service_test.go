package auth

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

type fakeRepo struct {
	mu          sync.Mutex
	users       map[string]User
	tokens      map[string]RefreshTokenRecord
	resetTokens map[string]PasswordResetTokenRecord
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		users:       make(map[string]User),
		tokens:      make(map[string]RefreshTokenRecord),
		resetTokens: make(map[string]PasswordResetTokenRecord),
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
	f.mu.Lock()
	defer f.mu.Unlock()
	f.tokens[p.TokenHash] = RefreshTokenRecord{UserID: p.UserID, TokenHash: p.TokenHash, ExpiresAt: p.ExpiresAt}
	return nil
}
func (f *fakeRepo) DeleteRefreshToken(_ context.Context, hash string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.tokens, hash)
	return nil
}
func (f *fakeRepo) DeleteAllRefreshTokensForUser(_ context.Context, userID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for k, v := range f.tokens {
		if v.UserID == userID {
			delete(f.tokens, k)
		}
	}
	return nil
}

func (f *fakeRepo) CreatePasswordResetToken(_ context.Context, p CreatePasswordResetTokenParams) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.resetTokens[p.TokenHash] = PasswordResetTokenRecord{
		ID:        uuid.New(),
		UserID:    p.UserID,
		TokenHash: p.TokenHash,
		ExpiresAt: p.ExpiresAt,
	}
	return nil
}

func (f *fakeRepo) GetPasswordResetTokenByHash(_ context.Context, hash string) (PasswordResetTokenRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	rec, ok := f.resetTokens[hash]
	if !ok {
		return PasswordResetTokenRecord{}, apperror.ErrInvalidToken
	}
	return rec, nil
}

func (f *fakeRepo) MarkPasswordResetTokenUsed(_ context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for k, rec := range f.resetTokens {
		if rec.ID == id {
			now := time.Now().UTC()
			rec.UsedAt = &now
			f.resetTokens[k] = rec
		}
	}
	return nil
}

func (f *fakeRepo) UpdateUserPassword(_ context.Context, userID uuid.UUID, hashedPassword string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	for email, u := range f.users {
		if u.ID == userID {
			u.HashedPassword = hashedPassword
			f.users[email] = u
		}
	}
	return nil
}

// RedeemRefreshToken mirrors the real repository's atomic DELETE...RETURNING:
// it deletes the row and returns it, holding the lock across the
// check-and-delete so two concurrent callers can't both see the row. A hash
// that's already gone (redeemed by a concurrent call, or unknown) reports
// apperror.ErrInvalidToken.
func (f *fakeRepo) RedeemRefreshToken(_ context.Context, hash string) (RefreshTokenRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	rec, ok := f.tokens[hash]
	if !ok {
		return RefreshTokenRecord{}, apperror.ErrInvalidToken
	}
	delete(f.tokens, hash)
	return rec, nil
}

// failingCreateRepo simulates the new refresh token's insert failing after
// the old one has already been redeemed (deleted). This is a deliberate
// safe-failure trade-off: the old token stays consumed (single-use, no
// race window) even though the caller ends up with no valid session and
// must log in again.
type failingCreateRepo struct {
	*fakeRepo
}

func (f *failingCreateRepo) CreateRefreshToken(_ context.Context, _ CreateRefreshTokenParams) error {
	return errors.New("create failed")
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

	svc.repo = &failingCreateRepo{fakeRepo: base}
	_, err = svc.Refresh(context.Background(), first.RefreshToken)
	if err == nil {
		t.Fatal("expected Refresh to fail when the new token cannot be persisted, got nil error")
	}
	// The old token was already redeemed (deleted) by the atomic
	// DELETE...RETURNING before the failed insert. That's intentional: the
	// old refresh token must never remain usable after being presented once,
	// even if minting its replacement fails — the caller just has to log in
	// again instead of the request race being reopened.
	if _, ok := base.tokens[HashRefreshToken(first.RefreshToken)]; ok {
		t.Error("expected old refresh token to be consumed even though persisting the new one failed")
	}
}

// TestRefreshConcurrentSameTokenOnlyOneSucceeds proves the fix for the race:
// two goroutines redeeming the same refresh token concurrently must not both
// succeed, closing the window that used to let one token mint two valid
// pairs.
func TestRefreshConcurrentSameTokenOnlyOneSucceeds(t *testing.T) {
	svc := newTestService()
	_, _, _ = svc.Register(context.Background(), RegisterInput{
		Email: "a@b.com", Nickname: "ab", Password: "supersecretpass",
	}, "")
	tok, err := svc.Login(context.Background(), "a@b.com", "supersecretpass", "")
	if err != nil {
		t.Fatalf("Login: %v", err)
	}

	repo := svc.repo.(*fakeRepo)
	repo.mu.Lock()
	hash := HashRefreshToken(tok.RefreshToken)
	_, ok := repo.tokens[hash]
	repo.mu.Unlock()
	if !ok {
		t.Fatalf("expected token %q to exist before the race", hash)
	}

	const n = 20
	results := make(chan error, n)
	var start sync.WaitGroup
	start.Add(1)
	for i := 0; i < n; i++ {
		go func() {
			start.Wait()
			_, err := svc.Refresh(context.Background(), tok.RefreshToken)
			results <- err
		}()
	}
	start.Done()

	successes := 0
	for i := 0; i < n; i++ {
		if err := <-results; err == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Errorf("expected exactly 1 of %d concurrent redemptions of the same token to succeed, got %d", n, successes)
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
