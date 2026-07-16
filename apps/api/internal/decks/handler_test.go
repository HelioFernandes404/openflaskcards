package decks

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
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/pagination"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// fakeDeckService is an in-memory implementation of decksServicer used to
// exercise the HTTP handlers without a real database.
type fakeDeckService struct {
	decks map[uuid.UUID]Deck
	stats []DeckStats
}

func newFakeDeckService() *fakeDeckService {
	return &fakeDeckService{decks: map[uuid.UUID]Deck{}}
}

func (f *fakeDeckService) Create(_ context.Context, in CreateInput) (Deck, error) {
	d := Deck{
		ID:                 uuid.New(),
		UserID:             in.UserID,
		ModuleID:           in.ModuleID,
		Name:               in.Name,
		Description:        in.Description,
		Tags:               in.Tags,
		NewCardsDailyLimit: in.NewCardsDailyLimit,
		CreatedAt:          time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:          time.Now().UTC().Format(time.RFC3339),
	}
	f.decks[d.ID] = d
	return d, nil
}

func (f *fakeDeckService) ListByUser(_ context.Context, userID uuid.UUID, _ pagination.Params) ([]Deck, error) {
	out := make([]Deck, 0)
	for _, d := range f.decks {
		if d.UserID == userID {
			out = append(out, d)
		}
	}
	return out, nil
}

func (f *fakeDeckService) GetByID(_ context.Context, id, userID uuid.UUID) (Deck, error) {
	d, ok := f.decks[id]
	if !ok {
		return Deck{}, apperror.ErrDeckNotFound
	}
	if d.UserID != userID {
		return Deck{}, apperror.ErrForbidden
	}
	return d, nil
}

func (f *fakeDeckService) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Deck, error) {
	d, err := f.GetByID(ctx, id, userID)
	if err != nil {
		return Deck{}, err
	}
	if in.Name != nil {
		d.Name = *in.Name
	}
	if in.Description != nil {
		d.Description = in.Description
	}
	if in.Tags != nil {
		d.Tags = in.Tags
	}
	if in.NewCardsDailyLimit != nil {
		d.NewCardsDailyLimit = *in.NewCardsDailyLimit
	}
	if in.ModuleIDSet {
		d.ModuleID = in.ModuleID
	}
	d.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.decks[id] = d
	return d, nil
}

func (f *fakeDeckService) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(ctx, id, userID); err != nil {
		return err
	}
	delete(f.decks, id)
	return nil
}

func (f *fakeDeckService) StatsByUser(_ context.Context, userID uuid.UUID) ([]DeckStats, error) {
	return f.stats, nil
}

func setupDecksRouter(t *testing.T, svc decksServicer) (*gin.Engine, *fakeJWT, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	userID := auth.DefaultUserID
	h := newHandlerWithService(svc)
	r := gin.New()
	h.RegisterRoutes(r.Group("/decks"))
	return r, &fakeJWT{}, userID
}

func tokenFor(t *testing.T, jwt *fakeJWT, userID uuid.UUID) string {
	t.Helper()
	tok, err := jwt.Sign(userID, "u@example.com")
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return tok
}

// fakeJWT stands in for the removed *auth.JWTManager now that the
// middleware no longer parses a bearer token (single-user mode always
// resolves the request identity to auth.DefaultUserID). Kept only so
// existing call sites threading a "jwt" through tokenFor/authedRequest
// don't need touching one by one.
type fakeJWT struct{}

func (fakeJWT) Sign(uuid.UUID, string) (string, error) { return "test-token", nil }

func authedRequest(method, path string, body []byte, token string) *http.Request {
	var req *http.Request
	if body != nil {
		req = httptest.NewRequest(method, path, bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func TestCreateDeckRejectsEmptyName(t *testing.T) {
	r, jwt, userID := setupDecksRouter(t, newFakeDeckService())
	body, _ := json.Marshal(map[string]any{"name": ""})
	req := authedRequest(http.MethodPost, "/decks", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateDeckAppliesDefaultDailyLimit(t *testing.T) {
	r, jwt, userID := setupDecksRouter(t, newFakeDeckService())
	body, _ := json.Marshal(map[string]any{"name": "Spanish"})
	req := authedRequest(http.MethodPost, "/decks", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["newCardsDailyLimit"].(float64) != 10 {
		t.Fatalf("newCardsDailyLimit = %v, want 10", out["newCardsDailyLimit"])
	}
	if out["tags"] == nil {
		t.Fatalf("tags should default to an empty array, got nil")
	}
}

func TestCreateDeckRejectsInvalidModuleID(t *testing.T) {
	r, jwt, userID := setupDecksRouter(t, newFakeDeckService())
	body, _ := json.Marshal(map[string]any{"name": "Spanish", "moduleId": "not-a-uuid"})
	req := authedRequest(http.MethodPost, "/decks", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndListDecks(t *testing.T) {
	svc := newFakeDeckService()
	r, jwt, userID := setupDecksRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"name": "Spanish"})
	req := authedRequest(http.MethodPost, "/decks", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = authedRequest(http.MethodGet, "/decks", nil, tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 || out[0]["name"] != "Spanish" {
		t.Fatalf("decks = %v", out)
	}
}

func TestGetDeckForbiddenForOtherUser(t *testing.T) {
	svc := newFakeDeckService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{UserID: ownerID, Name: "Private deck"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupDecksRouter(t, svc)
	req := authedRequest(http.MethodGet, "/decks/"+created.ID.String(), nil, tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestGetDeckNotFoundForInvalidID(t *testing.T) {
	r, jwt, userID := setupDecksRouter(t, newFakeDeckService())
	req := authedRequest(http.MethodGet, "/decks/not-a-uuid", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestUpdateDeckName(t *testing.T) {
	svc := newFakeDeckService()
	r, jwt, userID := setupDecksRouter(t, svc)
	created, _ := svc.Create(context.Background(), CreateInput{UserID: userID, Name: "Old name"})

	body, _ := json.Marshal(map[string]any{"name": "New name"})
	req := authedRequest(http.MethodPut, "/decks/"+created.ID.String(), body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["name"] != "New name" {
		t.Fatalf("name = %v, want %q", out["name"], "New name")
	}
}

func TestUpdateDeckClearsModuleIDWhenExplicitNull(t *testing.T) {
	svc := newFakeDeckService()
	moduleID := uuid.New()
	r, jwt, userID := setupDecksRouter(t, svc)
	created, _ := svc.Create(context.Background(), CreateInput{UserID: userID, Name: "Deck", ModuleID: &moduleID})

	req := authedRequest(http.MethodPut, "/decks/"+created.ID.String(), []byte(`{"moduleId":null}`), tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["moduleId"] != nil {
		t.Fatalf("moduleId = %v, want nil", out["moduleId"])
	}
}

func TestUpdateDeckRejectsInvalidModuleID(t *testing.T) {
	svc := newFakeDeckService()
	r, jwt, userID := setupDecksRouter(t, svc)
	created, _ := svc.Create(context.Background(), CreateInput{UserID: userID, Name: "Deck"})

	req := authedRequest(http.MethodPut, "/decks/"+created.ID.String(), []byte(`{"moduleId":"not-a-uuid"}`), tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestDeleteDeck(t *testing.T) {
	svc := newFakeDeckService()
	r, jwt, userID := setupDecksRouter(t, svc)
	created, _ := svc.Create(context.Background(), CreateInput{UserID: userID, Name: "Temp deck"})

	req := authedRequest(http.MethodDelete, "/decks/"+created.ID.String(), nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = authedRequest(http.MethodGet, "/decks/"+created.ID.String(), nil, tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("get-after-delete status = %d, want 404", rec.Code)
	}
}

func TestDeckStats(t *testing.T) {
	svc := newFakeDeckService()
	svc.stats = []DeckStats{
		{DeckID: uuid.New(), NewCount: 3, LearningCount: 1, ReviewCount: 2, TotalCards: 6, NewCardsDailyLimit: 20},
	}
	r, jwt, userID := setupDecksRouter(t, svc)
	req := authedRequest(http.MethodGet, "/decks/stats", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 || out[0]["totalCards"].(float64) != 6 {
		t.Fatalf("stats = %v", out)
	}
}
