package auth

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	jwt := NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	svc := NewService(newFakeRepo(), jwt, 30)
	h := NewHandler(svc)
	r := gin.New()
	g := r.Group("/api/v1/auth")
	h.RegisterRoutes(g)
	return r
}

func TestRegisterEndpoint(t *testing.T) {
	r := setupTestRouter()
	body, _ := json.Marshal(map[string]string{
		"email": "u@x.com", "nickname": "ux", "password": "supersecretpass",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("status: got %d, want 201, body=%s", w.Code, w.Body.String())
	}
}

func TestRegisterEndpointReturnsTokens(t *testing.T) {
	r := setupTestRouter()
	body, _ := json.Marshal(map[string]string{
		"email": "u@x.com", "nickname": "ux", "password": "supersecretpass",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("status: got %d, want 201, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if v, _ := resp["access_token"].(string); v == "" {
		t.Errorf("missing/empty access_token in register response, got body=%s", w.Body.String())
	}
	if v, _ := resp["refresh_token"].(string); v == "" {
		t.Errorf("missing/empty refresh_token in register response, got body=%s", w.Body.String())
	}
}

// loginAs registers and logs in a user, returning the parsed token response.
func loginAs(t *testing.T, r *gin.Engine, email, password string) map[string]any {
	t.Helper()
	regBody, _ := json.Marshal(map[string]string{"email": email, "nickname": "ux", "password": password})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(httptest.NewRecorder(), req)

	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("login status: got %d, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	return resp
}

func TestLoginEndpoint(t *testing.T) {
	r := setupTestRouter()
	resp := loginAs(t, r, "u@x.com", "supersecretpass")
	if _, ok := resp["access_token"]; !ok {
		t.Error("missing access_token in response")
	}
	if _, ok := resp["refresh_token"]; !ok {
		t.Error("missing refresh_token in response")
	}
}

func TestRegisterEndpointInvalidBody(t *testing.T) {
	r := setupTestRouter()
	for _, tc := range []struct {
		name string
		body map[string]string
	}{
		{"missing email", map[string]string{"nickname": "ux", "password": "supersecretpass"}},
		{"missing password", map[string]string{"email": "u@x.com", "nickname": "ux"}},
		{"password too short", map[string]string{"email": "u@x.com", "nickname": "ux", "password": "short"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			b, _ := json.Marshal(tc.body)
			req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(b))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			if w.Code != http.StatusUnprocessableEntity {
				t.Errorf("status: got %d, want 422, body=%s", w.Code, w.Body.String())
			}
		})
	}
}

func TestRefreshEndpoint(t *testing.T) {
	r := setupTestRouter()
	tok := loginAs(t, r, "u@x.com", "supersecretpass")

	body, _ := json.Marshal(map[string]string{"refresh_token": tok["refresh_token"].(string)})
	req := httptest.NewRequest("POST", "/api/v1/auth/refresh", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if _, ok := resp["access_token"]; !ok {
		t.Error("missing access_token after refresh")
	}
}

func TestRefreshEndpointMissingBody(t *testing.T) {
	r := setupTestRouter()
	req := httptest.NewRequest("POST", "/api/v1/auth/refresh", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status: got %d, want 422", w.Code)
	}
}

func TestMeEndpoint(t *testing.T) {
	r := setupTestRouter()
	tok := loginAs(t, r, "u@x.com", "supersecretpass")

	req := httptest.NewRequest("GET", "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+tok["access_token"].(string))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["email"] != "u@x.com" {
		t.Errorf("email: got %v, want u@x.com", resp["email"])
	}
}

func TestMeEndpointReturnsFullUserShape(t *testing.T) {
	r := setupTestRouter()
	tok := loginAs(t, r, "u@x.com", "supersecretpass")

	req := httptest.NewRequest("GET", "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+tok["access_token"].(string))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	for _, field := range []string{"isEmailVerified", "timezone", "createdAt", "updatedAt", "fsrsParameters", "desiredRetention", "providers", "optimizationStatus"} {
		if _, ok := resp[field]; !ok {
			t.Errorf("expected /auth/me response to include %q (same shape as /users/me), got body=%s", field, w.Body.String())
		}
	}
}

func TestMeEndpointUnauthorized(t *testing.T) {
	r := setupTestRouter()
	req := httptest.NewRequest("GET", "/api/v1/auth/me", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want 401", w.Code)
	}
}

func TestRegisterRoutesAppliesSensitiveMiddlewareOnlyToCredentialRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	jwt := NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	svc := NewService(newFakeRepo(), jwt, 30)
	h := NewHandler(svc)
	r := gin.New()
	g := r.Group("/api/v1/auth")

	blockAll := func(c *gin.Context) {
		c.AbortWithStatus(http.StatusTooManyRequests)
	}
	h.RegisterRoutes(g, blockAll)

	regBody, _ := json.Marshal(map[string]string{"email": "u@x.com", "nickname": "ux", "password": "supersecretpass"})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("register: expected sensitive middleware to apply (429), got %d", w.Code)
	}

	req = httptest.NewRequest("POST", "/api/v1/auth/logout", bytes.NewReader([]byte("{}")))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code == http.StatusTooManyRequests {
		t.Error("logout: sensitive middleware should not apply to logout")
	}
}

func setupTestRouterWithMailer() (*gin.Engine, *fakeMailer) {
	gin.SetMode(gin.TestMode)
	jwt := NewJWTManager([]byte("test-secret-test-secret-test-secret-32"), 15*time.Minute)
	mailer := &fakeMailer{}
	svc := NewService(newFakeRepo(), jwt, 30, WithPasswordReset(mailer, "http://localhost:5173", 30*time.Minute))
	h := NewHandler(svc)
	r := gin.New()
	g := r.Group("/api/v1/auth")
	h.RegisterRoutes(g)
	return r, mailer
}

func TestForgotPasswordEndpointAlwaysReturns200(t *testing.T) {
	r, _ := setupTestRouterWithMailer()

	body, _ := json.Marshal(map[string]string{"email": "nobody@example.com"})
	req := httptest.NewRequest("POST", "/api/v1/auth/forgot-password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200 even for an unknown email, body=%s", w.Code, w.Body.String())
	}
}

func TestForgotPasswordThenResetPasswordEndToEnd(t *testing.T) {
	r, mailer := setupTestRouterWithMailer()

	regBody, _ := json.Marshal(map[string]string{
		"email": "u@x.com", "nickname": "ux", "password": "old-password",
	})
	req := httptest.NewRequest("POST", "/api/v1/auth/register", bytes.NewReader(regBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusCreated {
		t.Fatalf("register: status %d, body=%s", w.Code, w.Body.String())
	}

	forgotBody, _ := json.Marshal(map[string]string{"email": "u@x.com"})
	req = httptest.NewRequest("POST", "/api/v1/auth/forgot-password", bytes.NewReader(forgotBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("forgot-password: status %d, body=%s", w.Code, w.Body.String())
	}
	if mailer.count() != 1 {
		t.Fatalf("expected 1 email sent, got %d", mailer.count())
	}
	token := extractToken(mailer.last().body)
	if token == "" {
		t.Fatalf("could not extract token from email body: %q", mailer.last().body)
	}

	resetBody, _ := json.Marshal(map[string]string{"token": token, "password": "new-password"})
	req = httptest.NewRequest("POST", "/api/v1/auth/reset-password", bytes.NewReader(resetBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNoContent {
		t.Fatalf("reset-password: status %d, body=%s", w.Code, w.Body.String())
	}

	// Old password rejected, new password accepted.
	loginBody, _ := json.Marshal(map[string]string{"email": "u@x.com", "password": "old-password"})
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("login with old password: got %d, want 401", w.Code)
	}

	loginBody, _ = json.Marshal(map[string]string{"email": "u@x.com", "password": "new-password"})
	req = httptest.NewRequest("POST", "/api/v1/auth/login", bytes.NewReader(loginBody))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Errorf("login with new password: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
}

func TestResetPasswordEndpointRejectsInvalidToken(t *testing.T) {
	r, _ := setupTestRouterWithMailer()
	body, _ := json.Marshal(map[string]string{"token": "bogus", "password": "new-password"})
	req := httptest.NewRequest("POST", "/api/v1/auth/reset-password", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want 401, body=%s", w.Code, w.Body.String())
	}
}
