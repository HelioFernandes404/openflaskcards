package cards

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
)

func TestSynthesizeTextRejectsMissingText(t *testing.T) {
	svc := newFakeCardsService()
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{})
	req := authedRequest(http.MethodPost, "/cards/audio", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestSynthesizeTextRejectsEmptyText(t *testing.T) {
	svc := newFakeCardsService()
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"text": ""})
	req := authedRequest(http.MethodPost, "/cards/audio", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestSynthesizeTextAcceptsTextAtMaxLength(t *testing.T) {
	svc := newFakeCardsService()
	svc.synthesizeText = "base64audio"
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"text": strings.Repeat("a", 5000)})
	req := authedRequest(http.MethodPost, "/cards/audio", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %s", rec.Code, rec.Body.String())
	}
}

func TestSynthesizeTextRejectsTextOverMaxLength(t *testing.T) {
	svc := newFakeCardsService()
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"text": strings.Repeat("a", 5001)})
	req := authedRequest(http.MethodPost, "/cards/audio", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestSynthesizeTextReturnsAudioForValidText(t *testing.T) {
	svc := newFakeCardsService()
	svc.synthesizeText = "base64audio"
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"text": "hello world"})
	req := authedRequest(http.MethodPost, "/cards/audio", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["audioBase64"] != "base64audio" {
		t.Fatalf("audioBase64 = %v, want base64audio", out["audioBase64"])
	}
}

func TestSynthesizeTextPropagatesServiceUnavailableError(t *testing.T) {
	svc := newFakeCardsService()
	svc.synthesizeErr = apperror.New("TTS_UNAVAILABLE", http.StatusServiceUnavailable, "tts service not configured")
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"text": "hello world"})
	req := authedRequest(http.MethodPost, "/cards/audio", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503, body = %s", rec.Code, rec.Body.String())
	}
}
