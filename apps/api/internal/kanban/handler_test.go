package kanban

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sort"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/pagination"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)


type fakeKanbanService struct {
	cards map[uuid.UUID]KanbanCard
}

func newFakeKanbanService() *fakeKanbanService {
	return &fakeKanbanService{cards: map[uuid.UUID]KanbanCard{}}
}

func (f *fakeKanbanService) Create(_ context.Context, in CreateInput) (KanbanCard, error) {
	status := in.Status
	if status == "" {
		status = "backlog"
	}
	priority := in.Priority
	if priority == "" {
		priority = "medium"
	}
	c := KanbanCard{
		ID:          uuid.New(),
		UserID:      in.UserID,
		Title:       in.Title,
		Description: in.Description,
		Status:      status,
		Priority:    priority,
		Assignee:    in.Assignee,
		Position:    int32(len(f.cards)),
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:   time.Now().UTC().Format(time.RFC3339),
	}
	f.cards[c.ID] = c
	return c, nil
}

func (f *fakeKanbanService) ListByUser(_ context.Context, userID uuid.UUID, status *string, _ pagination.Params) ([]KanbanCard, error) {
	out := make([]KanbanCard, 0)
	for _, c := range f.cards {
		if c.UserID != userID {
			continue
		}
		if status != nil && *status != "" && c.Status != *status {
			continue
		}
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
	return out, nil
}

func (f *fakeKanbanService) GetByID(_ context.Context, id, userID uuid.UUID) (KanbanCard, error) {
	c, ok := f.cards[id]
	if !ok {
		return KanbanCard{}, apperror.ErrKanbanCardNotFound
	}
	if c.UserID != userID {
		return KanbanCard{}, apperror.ErrForbidden
	}
	return c, nil
}

func (f *fakeKanbanService) Update(_ context.Context, id, userID uuid.UUID, in UpdateInput) (KanbanCard, error) {
	c, err := f.GetByID(context.Background(), id, userID)
	if err != nil {
		return KanbanCard{}, err
	}
	if in.Title != nil {
		c.Title = *in.Title
	}
	if in.Description != nil {
		c.Description = *in.Description
	}
	if in.Status != nil {
		c.Status = *in.Status
	}
	if in.Priority != nil {
		c.Priority = *in.Priority
	}
	if in.Assignee != nil {
		c.Assignee = in.Assignee
	}
	if in.VerificationNote != nil {
		c.VerificationNote = *in.VerificationNote
	}
	c.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.cards[id] = c
	return c, nil
}

func (f *fakeKanbanService) Delete(_ context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return err
	}
	delete(f.cards, id)
	return nil
}

func (f *fakeKanbanService) PullNext(_ context.Context, userID uuid.UUID, assignee string) (KanbanCard, error) {
	var next *KanbanCard
	for _, c := range f.cards {
		if c.UserID != userID || c.Status != "todo" {
			continue
		}
		cc := c
		if next == nil || cc.Position < next.Position {
			next = &cc
		}
	}
	if next == nil {
		return KanbanCard{}, apperror.ErrNoTodoCards
	}
	next.Status = "in_progress"
	next.Assignee = &assignee
	next.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.cards[next.ID] = *next
	return *next, nil
}

func setupRouter(t *testing.T, svc kanbanServicer) (*gin.Engine, *fakeJWT, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	userID := auth.DefaultUserID
	h := newHandlerWithService(svc)
	r := gin.New()
	h.RegisterRoutes(r.Group("/kanban-cards"))
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

func TestCreateKanbanCardRejectsEmptyTitle(t *testing.T) {
	svc := newFakeKanbanService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"title": ""})
	req := httptest.NewRequest(http.MethodPost, "/kanban-cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateKanbanCardRejectsInvalidPriority(t *testing.T) {
	svc := newFakeKanbanService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"title": "Card 1", "priority": "urgent"})
	req := httptest.NewRequest(http.MethodPost, "/kanban-cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndListKanbanCards(t *testing.T) {
	svc := newFakeKanbanService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"title":       "Implement kanban",
		"description": "ship it",
		"status":      "todo",
		"priority":    "high",
	})
	req := httptest.NewRequest(http.MethodPost, "/kanban-cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/kanban-cards?status=todo", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out) != 1 || out[0]["status"] != "todo" {
		t.Fatalf("cards = %v, want 1 todo card", out)
	}
}

func TestGetKanbanCardForbiddenForOtherUser(t *testing.T) {
	svc := newFakeKanbanService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{UserID: ownerID, Title: "Private card"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/kanban-cards/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestUpdateKanbanCardMovesStatus(t *testing.T) {
	svc := newFakeKanbanService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{UserID: userID, Title: "Move me", Status: "todo"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"status": "done"})
	req := httptest.NewRequest(http.MethodPut, "/kanban-cards/"+created.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("update status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out["status"] != "done" {
		t.Fatalf("status = %v, want done", out["status"])
	}
}

func TestPullNextKanbanCard(t *testing.T) {
	svc := newFakeKanbanService()
	r, jwt, userID := setupRouter(t, svc)

	req := httptest.NewRequest(http.MethodPost, "/kanban-cards/pull-next", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("pull-next with no todo cards status = %d, want 404, body = %s", rec.Code, rec.Body.String())
	}

	created, err := svc.Create(context.Background(), CreateInput{UserID: userID, Title: "Pull me", Status: "todo"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req = httptest.NewRequest(http.MethodPost, "/kanban-cards/pull-next", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("pull-next status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out["id"] != created.ID.String() {
		t.Fatalf("id = %v, want %s", out["id"], created.ID.String())
	}
	if out["status"] != "in_progress" {
		t.Fatalf("status = %v, want in_progress", out["status"])
	}
	if out["assignee"] != "claude_code" {
		t.Fatalf("assignee = %v, want claude_code", out["assignee"])
	}

	req = httptest.NewRequest(http.MethodPost, "/kanban-cards/pull-next", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("second pull-next status = %d, want 404, body = %s", rec.Code, rec.Body.String())
	}
}

func TestDeleteKanbanCard(t *testing.T) {
	svc := newFakeKanbanService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{UserID: userID, Title: "Temp card"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/kanban-cards/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
