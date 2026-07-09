package users

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func setupUsersRouter(t *testing.T) (*gin.Engine, uuid.UUID, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	svc, r := newTestService()
	u := seedUser(r)

	jwtMgr := auth.NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	token, err := jwtMgr.Sign(u.ID, u.Email)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	h := NewHandler(svc, nil, jwtMgr)
	router := gin.New()
	h.RegisterRoutes(router.Group("/api/v1/users"))
	return router, u.ID, token
}

func TestMeEndpointReturnsUser(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["email"] != "a@b.com" {
		t.Errorf("email: got %v, want a@b.com", resp["email"])
	}
}

func TestMeEndpointUnauthorized(t *testing.T) {
	r, _, _ := setupUsersRouter(t)
	req := httptest.NewRequest("GET", "/api/v1/users/me", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want 401", w.Code)
	}
}

func TestUpdateMeEndpointRejectsWeakPassword(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	body, _ := json.Marshal(map[string]string{"password": "short"})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: got %d, want 422, body=%s", w.Code, w.Body.String())
	}
}

func TestUpdateMeEndpointRejectsMalformedEmail(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	body, _ := json.Marshal(map[string]string{"email": "not-an-email"})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: got %d, want 422, body=%s", w.Code, w.Body.String())
	}
}

func TestUpdateMeEndpointAcceptsStrongPasswordAndValidEmail(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	body, _ := json.Marshal(map[string]string{
		"password": "supersecretpass",
		"email":    "new@example.com",
	})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
}

func TestUpdateMeEndpointClearsTimezoneWhenSentAsNull(t *testing.T) {
	r, _, token := setupUsersRouter(t)

	// First set a timezone.
	tz := "America/Sao_Paulo"
	body, _ := json.Marshal(map[string]string{"timezone": tz})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("set timezone status: got %d, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["timezone"] != tz {
		t.Fatalf("expected timezone to be set to %q first, got %v", tz, resp["timezone"])
	}

	// Now explicitly clear it back to default via `timezone: null`.
	req = httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader([]byte(`{"timezone": null}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("clear timezone status: got %d, body=%s", w.Code, w.Body.String())
	}
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["timezone"] != nil {
		t.Errorf("expected timezone to be cleared to nil, got %v", resp["timezone"])
	}
}

func TestUpdateFSRSEndpointHappyPath(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	weights := make([]float64, 21)
	for i := range weights {
		weights[i] = 0.5
	}
	retention := 0.85
	body, _ := json.Marshal(map[string]any{
		"weights":           weights,
		"desired_retention": retention,
	})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me/fsrs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["desiredRetention"] != 0.85 {
		t.Errorf("desiredRetention: got %v, want 0.85", resp["desiredRetention"])
	}
}

func TestUpdateFSRSEndpointWrongWeightCount(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	body, _ := json.Marshal(map[string]any{
		"weights": make([]float64, 10),
	})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me/fsrs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: got %d, want 422, body=%s", w.Code, w.Body.String())
	}
}

func TestUpdateFSRSEndpointInvalidRetention(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	for _, bad := range []float64{0.0, 1.5} {
		body, _ := json.Marshal(map[string]any{"desired_retention": bad})
		req := httptest.NewRequest("PATCH", "/api/v1/users/me/fsrs", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("retention=%.1f: got %d, want 422", bad, w.Code)
		}
	}
}

func TestUpdateFSRSEndpointUnauthorized(t *testing.T) {
	r, _, _ := setupUsersRouter(t)
	body, _ := json.Marshal(map[string]any{"desired_retention": 0.9})
	req := httptest.NewRequest("PATCH", "/api/v1/users/me/fsrs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want 401", w.Code)
	}
}

// setupUsersRouterWithPassword mirrors setupUsersRouter but gives the account
// a local password, as accounts created via email/password registration have.
// It also returns the fake repo and user ID so tests can assert on the stored
// hash after the request.
func setupUsersRouterWithPassword(t *testing.T, plainPassword string) (*gin.Engine, string, *fakeRepo, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	svc, repo := newTestService()
	u := seedUser(repo)
	hashed, err := auth.HashPassword(plainPassword)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	u.HashedPassword = &hashed
	repo.users[u.ID] = u

	jwtMgr := auth.NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	token, err := jwtMgr.Sign(u.ID, u.Email)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	h := NewHandler(svc, nil, jwtMgr)
	router := gin.New()
	h.RegisterRoutes(router.Group("/api/v1/users"))
	return router, token, repo, u.ID
}

// storedPasswordVerifies reports whether the user's persisted hash matches the
// given plaintext, so tests can prove which password is actually in effect.
func storedPasswordVerifies(t *testing.T, repo *fakeRepo, id uuid.UUID, plain string) bool {
	t.Helper()
	u, ok := repo.users[id]
	if !ok {
		t.Fatalf("user %s not found in fake repo", id)
	}
	if u.HashedPassword == nil {
		return false
	}
	return auth.VerifyPassword(*u.HashedPassword, plain)
}

// fakeAuthRepo is a minimal auth.Repository fake used only to observe whether
// LogoutAll (DeleteAllRefreshTokensForUser) was invoked after a password
// change, without pulling in the auth package's own test doubles.
type fakeAuthRepo struct {
	user                auth.User
	loggedOutUserIDs    []uuid.UUID
	refreshTokensByHash map[string]auth.RefreshTokenRecord
}

func (f *fakeAuthRepo) CreateUser(_ context.Context, _ auth.CreateUserParams) (auth.User, error) {
	return auth.User{}, nil
}
func (f *fakeAuthRepo) GetUserByEmail(_ context.Context, _ string) (auth.User, error) {
	return f.user, nil
}
func (f *fakeAuthRepo) GetUserByID(_ context.Context, id uuid.UUID) (auth.User, error) {
	if id == f.user.ID {
		return f.user, nil
	}
	return auth.User{}, apperror.ErrUserNotFound
}
func (f *fakeAuthRepo) CreateRefreshToken(_ context.Context, _ auth.CreateRefreshTokenParams) error {
	return nil
}
func (f *fakeAuthRepo) DeleteRefreshToken(_ context.Context, _ string) error { return nil }
func (f *fakeAuthRepo) DeleteAllRefreshTokensForUser(_ context.Context, userID uuid.UUID) error {
	f.loggedOutUserIDs = append(f.loggedOutUserIDs, userID)
	return nil
}
func (f *fakeAuthRepo) RedeemRefreshToken(_ context.Context, hash string) (auth.RefreshTokenRecord, error) {
	rec, ok := f.refreshTokensByHash[hash]
	if !ok {
		return auth.RefreshTokenRecord{}, apperror.ErrInvalidToken
	}
	delete(f.refreshTokensByHash, hash)
	return rec, nil
}
func (f *fakeAuthRepo) CreatePasswordResetToken(_ context.Context, _ auth.CreatePasswordResetTokenParams) error {
	return nil
}
func (f *fakeAuthRepo) GetPasswordResetTokenByHash(_ context.Context, _ string) (auth.PasswordResetTokenRecord, error) {
	return auth.PasswordResetTokenRecord{}, apperror.ErrInvalidToken
}
func (f *fakeAuthRepo) MarkPasswordResetTokenUsed(_ context.Context, _ uuid.UUID) error {
	return nil
}
func (f *fakeAuthRepo) UpdateUserPassword(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}

// TestUpdateMePasswordChangeRevokesExistingSessions ensures a password change
// through PATCH /users/me calls auth's LogoutAll, so a stolen refresh token
// on another device stops working once the owner changes their password.
func TestUpdateMePasswordChangeRevokesExistingSessions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc, repo := newTestService()
	u := seedUser(repo)
	hashed, err := auth.HashPassword("oldpassword123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	u.HashedPassword = &hashed
	repo.users[u.ID] = u

	jwtMgr := auth.NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	token, err := jwtMgr.Sign(u.ID, u.Email)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	authRepo := &fakeAuthRepo{
		user: auth.User{ID: u.ID, Email: u.Email, HashedPassword: hashed},
	}
	authSvc := auth.NewService(authRepo, jwtMgr, 30)

	h := NewHandler(svc, authSvc, jwtMgr)
	r := gin.New()
	h.RegisterRoutes(r.Group("/api/v1/users"))

	w := patchMe(t, r, token, map[string]string{
		"password":        "newpassword123",
		"currentPassword": "oldpassword123",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	if len(authRepo.loggedOutUserIDs) != 1 || authRepo.loggedOutUserIDs[0] != u.ID {
		t.Errorf("expected LogoutAll to be called once for user %s, got calls: %v", u.ID, authRepo.loggedOutUserIDs)
	}
}

// TestUpdateMeProfileChangeDoesNotRevokeSessions ensures non-password updates
// don't trigger a needless LogoutAll.
func TestUpdateMeProfileChangeDoesNotRevokeSessions(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc, repo := newTestService()
	u := seedUser(repo)

	jwtMgr := auth.NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	token, err := jwtMgr.Sign(u.ID, u.Email)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}

	authRepo := &fakeAuthRepo{user: auth.User{ID: u.ID, Email: u.Email}}
	authSvc := auth.NewService(authRepo, jwtMgr, 30)

	h := NewHandler(svc, authSvc, jwtMgr)
	r := gin.New()
	h.RegisterRoutes(r.Group("/api/v1/users"))

	w := patchMe(t, r, token, map[string]string{"nickname": "newnick"})
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	if len(authRepo.loggedOutUserIDs) != 0 {
		t.Errorf("expected no LogoutAll calls for a non-password update, got: %v", authRepo.loggedOutUserIDs)
	}
}

func patchMe(t *testing.T, r *gin.Engine, token string, payload map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("PATCH", "/api/v1/users/me", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestUpdateMePasswordChangeRejectsMissingOrWrongCurrentPassword(t *testing.T) {
	cases := []struct {
		name    string
		payload map[string]string
	}{
		{
			name:    "missing currentPassword",
			payload: map[string]string{"password": "newpassword123"},
		},
		{
			name: "wrong currentPassword",
			payload: map[string]string{
				"password":        "newpassword123",
				"currentPassword": "not-the-old-password",
			},
		},
		{
			name: "empty currentPassword",
			payload: map[string]string{
				"password":        "newpassword123",
				"currentPassword": "",
			},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r, token, repo, uid := setupUsersRouterWithPassword(t, "oldpassword123")
			w := patchMe(t, r, token, tc.payload)
			if w.Code != http.StatusUnauthorized {
				t.Errorf("status: got %d, want 401, body=%s", w.Code, w.Body.String())
			}
			if !storedPasswordVerifies(t, repo, uid, "oldpassword123") {
				t.Error("stored password changed despite the rejected request; old password must remain in effect")
			}
			if storedPasswordVerifies(t, repo, uid, "newpassword123") {
				t.Error("new password took effect despite the rejected request")
			}
		})
	}
}

func TestUpdateMePasswordChangeSucceedsWithCorrectCurrentPassword(t *testing.T) {
	r, token, repo, uid := setupUsersRouterWithPassword(t, "oldpassword123")
	w := patchMe(t, r, token, map[string]string{
		"password":        "newpassword123",
		"currentPassword": "oldpassword123",
	})
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	if !storedPasswordVerifies(t, repo, uid, "newpassword123") {
		t.Error("expected the new password to be in effect after a successful change")
	}
	if storedPasswordVerifies(t, repo, uid, "oldpassword123") {
		t.Error("expected the old password to stop working after a successful change")
	}
}

func TestUpdateMeAccountWithoutLocalPasswordCanSetOneDirectly(t *testing.T) {
	// OAuth-style accounts have no local password, so there is no current
	// password to confirm — setting the first one must not require it. Once a
	// local password exists, further changes must go through the guard.
	gin.SetMode(gin.TestMode)
	svc, repo := newTestService()
	u := seedUser(repo)
	jwtMgr := auth.NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	token, err := jwtMgr.Sign(u.ID, u.Email)
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	h := NewHandler(svc, nil, jwtMgr)
	r := gin.New()
	h.RegisterRoutes(r.Group("/api/v1/users"))

	w := patchMe(t, r, token, map[string]string{"password": "firstpassword123"})
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	if !storedPasswordVerifies(t, repo, u.ID, "firstpassword123") {
		t.Error("expected the first password to be persisted for the OAuth-style account")
	}

	// The account now has a local password: changing it again without the
	// current password must be rejected.
	w = patchMe(t, r, token, map[string]string{"password": "secondpassword123"})
	if w.Code != http.StatusUnauthorized {
		t.Errorf("second change without currentPassword: got %d, want 401, body=%s", w.Code, w.Body.String())
	}
	if !storedPasswordVerifies(t, repo, u.ID, "firstpassword123") {
		t.Error("expected the first password to remain in effect after the rejected second change")
	}
}

func TestUpdateMeProfileFieldsDontRequireCurrentPassword(t *testing.T) {
	r, token, repo, uid := setupUsersRouterWithPassword(t, "oldpassword123")
	w := patchMe(t, r, token, map[string]string{"name": "New Name"})
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200 for non-password update, body=%s", w.Code, w.Body.String())
	}
	if !storedPasswordVerifies(t, repo, uid, "oldpassword123") {
		t.Error("profile-only update must not touch the stored password")
	}
}
