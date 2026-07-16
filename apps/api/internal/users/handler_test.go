package users

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// setupUsersRouter seeds a single user under auth.DefaultUserID, since the
// middleware no longer parses a bearer token — every request resolves to
// that fixed identity in this single-user deployment. The returned "token"
// is a dummy string kept only so existing call sites don't need to change;
// the handler never inspects it.
func setupUsersRouter(t *testing.T) (*gin.Engine, uuid.UUID, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	svc, r := newTestService()
	u := seedUser(r)
	delete(r.users, u.ID)
	u.ID = auth.DefaultUserID
	r.users[u.ID] = u

	h := NewHandler(svc)
	router := gin.New()
	h.RegisterRoutes(router.Group("/api/v1/users"))
	return router, u.ID, "test-token"
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

func TestUpdateMeEndpointAcceptsValidEmail(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	body, _ := json.Marshal(map[string]string{
		"email": "new@example.com",
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

func TestUpdateMeProfileFieldsUpdateSuccessfully(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	w := patchMe(t, r, token, map[string]string{"name": "New Name"})
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d, want 200, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["name"] != "New Name" {
		t.Errorf("name: got %v, want New Name", resp["name"])
	}
}
