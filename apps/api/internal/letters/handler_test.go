package letters

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

type fakeLetterService struct {
	letters map[uuid.UUID]Letter
}

func newFakeLetterService() *fakeLetterService {
	return &fakeLetterService{letters: map[uuid.UUID]Letter{}}
}

func (f *fakeLetterService) Create(_ context.Context, in CreateInput) (Letter, error) {
	letter := Letter{
		ID:             uuid.New(),
		UserID:         in.UserID,
		Title:          in.Title,
		Artist:         in.Artist,
		OriginalLyrics: in.OriginalLyrics,
		Translation:    in.Translation,
		DeckID:         in.DeckID,
		CreatedAt:      time.Now().UTC().Format(time.RFC3339),
		UpdatedAt:      time.Now().UTC().Format(time.RFC3339),
	}
	f.letters[letter.ID] = letter
	return letter, nil
}

func (f *fakeLetterService) ListByUser(_ context.Context, userID uuid.UUID) ([]Letter, error) {
	out := make([]Letter, 0)
	for _, letter := range f.letters {
		if letter.UserID == userID {
			out = append(out, letter)
		}
	}
	return out, nil
}

func (f *fakeLetterService) GetByID(_ context.Context, id, userID uuid.UUID) (Letter, error) {
	letter, ok := f.letters[id]
	if !ok {
		return Letter{}, apperror.ErrLetterNotFound
	}
	if letter.UserID != userID {
		return Letter{}, apperror.ErrForbidden
	}
	return letter, nil
}

func (f *fakeLetterService) Update(_ context.Context, id, userID uuid.UUID, in UpdateInput) (Letter, error) {
	letter, err := f.GetByID(context.Background(), id, userID)
	if err != nil {
		return Letter{}, err
	}
	if in.Title != nil {
		letter.Title = *in.Title
	}
	if in.Artist != nil {
		letter.Artist = *in.Artist
	}
	if in.OriginalLyrics != nil {
		letter.OriginalLyrics = *in.OriginalLyrics
	}
	if in.Translation != nil {
		letter.Translation = *in.Translation
	}
	if in.DeckIDSet {
		letter.DeckID = in.DeckID
	}
	letter.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.letters[id] = letter
	return letter, nil
}

func (f *fakeLetterService) Delete(_ context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return err
	}
	delete(f.letters, id)
	return nil
}

func setupRouter(t *testing.T, svc letterServicer) (*gin.Engine, *auth.JWTManager, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	jwt := auth.NewJWTManager([]byte(testSecret), 15*time.Minute)
	userID := uuid.New()
	h := newHandlerWithService(svc, jwt)
	r := gin.New()
	h.RegisterRoutes(r.Group("/letters"))
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

func TestCreateLetterRequiresAuth(t *testing.T) {
	r, _, _ := setupRouter(t, newFakeLetterService())
	body, _ := json.Marshal(map[string]any{"title": "Breaking The Habit"})
	req := httptest.NewRequest(http.MethodPost, "/letters", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestCreateAndListLetters(t *testing.T) {
	svc := newFakeLetterService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"title":          "Breaking The Habit",
		"artist":         "Linkin Park",
		"originalLyrics": "Memories consume",
		"translation":    "Memories consume",
	})
	req := httptest.NewRequest(http.MethodPost, "/letters", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/letters", nil)
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
		t.Fatalf("letters len = %d, want 1", len(out))
	}
}
