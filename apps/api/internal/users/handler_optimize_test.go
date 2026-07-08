package users

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestOptimizeFSRSEndpointAccepted(t *testing.T) {
	r, _, token := setupUsersRouter(t)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/me/fsrs/optimize", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusAccepted {
		t.Fatalf("status: got %d, want 202, body=%s", w.Code, w.Body.String())
	}
}
