package notes

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

const testSecret = "test-secret-32-chars-long-secret!"

type fakeNoteService struct {
	notes map[uuid.UUID]Note
}

func newFakeNoteService() *fakeNoteService {
	return &fakeNoteService{notes: map[uuid.UUID]Note{}}
}

func (f *fakeNoteService) Create(_ context.Context, in CreateInput) (Note, error) {
	n := Note{
		ID: uuid.New(), UserID: in.UserID, Title: in.Title, Content: in.Content,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	f.notes[n.ID] = n
	return n, nil
}

func (f *fakeNoteService) ListByUser(_ context.Context, userID uuid.UUID) ([]Note, error) {
	out := make([]Note, 0)
	for _, n := range f.notes {
		if n.UserID == userID {
			out = append(out, n)
		}
	}
	return out, nil
}

func (f *fakeNoteService) GetByID(_ context.Context, id, userID uuid.UUID) (Note, error) {
	n, ok := f.notes[id]
	if !ok {
		return Note{}, apperror.ErrNoteNotFound
	}
	if n.UserID != userID {
		return Note{}, apperror.ErrForbidden
	}
	return n, nil
}

func (f *fakeNoteService) Update(_ context.Context, id, userID uuid.UUID, in UpdateInput) (Note, error) {
	n, err := f.GetByID(context.Background(), id, userID)
	if err != nil {
		return Note{}, err
	}
	if in.Title != nil {
		n.Title = *in.Title
	}
	if in.Content != nil {
		n.Content = *in.Content
	}
	n.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.notes[id] = n
	return n, nil
}

func (f *fakeNoteService) Delete(_ context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return err
	}
	delete(f.notes, id)
	return nil
}

func setupRouter(t *testing.T, svc noteServicer) (*gin.Engine, *auth.JWTManager, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	jwt := auth.NewJWTManager([]byte(testSecret), 15*time.Minute)
	userID := uuid.New()
	h := newHandlerWithService(svc, jwt)
	r := gin.New()
	h.RegisterRoutes(r.Group("/notes"))
	return r, jwt, userID
}

func tokenFor(t *testing.T, jwt *auth.JWTManager, userID uuid.UUID) string {
	t.Helper()
	tok, err := jwt.Sign(userID, "u@example.com")
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return tok
}

func TestCreateNoteRequiresAuth(t *testing.T) {
	r, _, _ := setupRouter(t, newFakeNoteService())
	body, _ := json.Marshal(map[string]any{"title": "Note 1"})
	req := httptest.NewRequest(http.MethodPost, "/notes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestCreateNoteRejectsEmptyTitle(t *testing.T) {
	svc := newFakeNoteService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"title": ""})
	req := httptest.NewRequest(http.MethodPost, "/notes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndListNotes(t *testing.T) {
	svc := newFakeNoteService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"title": "Note 1", "content": "# hello"})
	req := httptest.NewRequest(http.MethodPost, "/notes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/notes", nil)
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
	if len(out) != 1 {
		t.Fatalf("notes len = %d, want 1", len(out))
	}
}

func TestGetNoteForbiddenForOtherUser(t *testing.T) {
	svc := newFakeNoteService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: ownerID, Title: "Private Note",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/notes/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestDeleteNote(t *testing.T) {
	svc := newFakeNoteService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "Temp Note",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/notes/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
