package prompttemplates

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)


type fakePromptTemplateService struct {
	templates map[uuid.UUID]PromptTemplate
}

func newFakePromptTemplateService() *fakePromptTemplateService {
	return &fakePromptTemplateService{templates: map[uuid.UUID]PromptTemplate{}}
}

func (f *fakePromptTemplateService) Create(_ context.Context, in CreateInput) (PromptTemplate, error) {
	for _, t := range f.templates {
		if t.UserID == in.UserID && t.Name == in.Name {
			return PromptTemplate{}, apperror.New(
				"VALIDATION_ERROR",
				422,
				"template name already exists",
			)
		}
	}
	if strings.TrimSpace(in.Body) == "" {
		return PromptTemplate{}, apperror.New(
			"VALIDATION_ERROR",
			422,
			"body is required",
		)
	}
	t := PromptTemplate{
		ID:        uuid.New(),
		UserID:    in.UserID,
		Name:      in.Name,
		Body:      in.Body,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	f.templates[t.ID] = t
	return t, nil
}

func (f *fakePromptTemplateService) ListByUser(_ context.Context, userID uuid.UUID) ([]PromptTemplate, error) {
	out := make([]PromptTemplate, 0)
	for _, t := range f.templates {
		if t.UserID == userID {
			out = append(out, t)
		}
	}
	return out, nil
}

func (f *fakePromptTemplateService) GetByID(_ context.Context, id, userID uuid.UUID) (PromptTemplate, error) {
	t, ok := f.templates[id]
	if !ok {
		return PromptTemplate{}, apperror.ErrPromptTemplateNotFound
	}
	if t.UserID != userID {
		return PromptTemplate{}, apperror.ErrForbidden
	}
	return t, nil
}

func (f *fakePromptTemplateService) Update(
	_ context.Context,
	id, userID uuid.UUID,
	in UpdateInput,
) (PromptTemplate, error) {
	t, err := f.GetByID(context.Background(), id, userID)
	if err != nil {
		return PromptTemplate{}, err
	}
	if in.Name != nil {
		for _, other := range f.templates {
			if other.UserID == userID && other.Name == *in.Name && other.ID != id {
				return PromptTemplate{}, apperror.New(
					"VALIDATION_ERROR",
					422,
					"template name already exists",
				)
			}
		}
		t.Name = *in.Name
	}
	if in.Body != nil {
		if strings.TrimSpace(*in.Body) == "" {
			return PromptTemplate{}, apperror.New(
				"VALIDATION_ERROR",
				422,
				"body is required",
			)
		}
		t.Body = *in.Body
	}
	t.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.templates[id] = t
	return t, nil
}

func (f *fakePromptTemplateService) Delete(_ context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return err
	}
	delete(f.templates, id)
	return nil
}

func setupRouter(t *testing.T, svc promptTemplateServicer) (*gin.Engine, *fakeJWT, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	userID := auth.DefaultUserID
	h := newHandlerWithService(svc)
	r := gin.New()
	h.RegisterRoutes(r.Group("/prompt-templates"))
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

func TestCreatePromptTemplateRejectsEmptyName(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"name": "",
		"body": "Word: {{TARGET_WORD}}",
	})
	req := httptest.NewRequest(http.MethodPost, "/prompt-templates", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreatePromptTemplateRejectsEmptyBody(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"name": "Vocab",
		"body": "   ",
	})
	req := httptest.NewRequest(http.MethodPost, "/prompt-templates", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreatePromptTemplateRejectsDuplicateName(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"name": "Vocab",
		"body": "Word: {{TARGET_WORD}}",
	})
	req := httptest.NewRequest(http.MethodPost, "/prompt-templates", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("first create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodPost, "/prompt-templates", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("duplicate status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndListPromptTemplates(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"name": "Visual vocab",
		"body": "Word: {{TARGET_WORD}} in {{SENTENCE}}\n{{styleBlock}}",
	})
	req := httptest.NewRequest(http.MethodPost, "/prompt-templates", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var created map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create: %v", err)
	}
	if created["name"] != "Visual vocab" {
		t.Fatalf("name = %v, want Visual vocab", created["name"])
	}
	if !strings.Contains(created["body"].(string), "{{TARGET_WORD}}") {
		t.Fatalf("body missing TARGET_WORD placeholder")
	}

	req = httptest.NewRequest(http.MethodGet, "/prompt-templates", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("templates len = %d, want 1", len(out))
	}
}

func TestGetPromptTemplateForbiddenForOtherUser(t *testing.T) {
	svc := newFakePromptTemplateService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: ownerID,
		Name:   "Private",
		Body:   "Word: {{TARGET_WORD}}",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/prompt-templates/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestGetPromptTemplateSuccess(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID,
		Name:   "Mine",
		Body:   "Word: {{TARGET_WORD}}",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/prompt-templates/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %s", rec.Code, rec.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if got["name"] != "Mine" {
		t.Fatalf("name = %v, want Mine", got["name"])
	}
	if got["body"] != "Word: {{TARGET_WORD}}" {
		t.Fatalf("body = %v", got["body"])
	}
}

func TestGetPromptTemplateNotFound(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/prompt-templates/"+uuid.New().String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestUpdatePromptTemplateRejectsEmptyBody(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID,
		Name:   "Original",
		Body:   "Word: {{TARGET_WORD}}",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"body": "   "})
	req := httptest.NewRequest(http.MethodPut, "/prompt-templates/"+created.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestUpdatePromptTemplateRejectsDuplicateName(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	_, err := svc.Create(context.Background(), CreateInput{
		UserID: userID,
		Name:   "Taken",
		Body:   "Word: {{TARGET_WORD}}",
	})
	if err != nil {
		t.Fatalf("create first: %v", err)
	}
	second, err := svc.Create(context.Background(), CreateInput{
		UserID: userID,
		Name:   "Other",
		Body:   "Phrase: {{SENTENCE}}",
	})
	if err != nil {
		t.Fatalf("create second: %v", err)
	}

	body, _ := json.Marshal(map[string]any{"name": "Taken"})
	req := httptest.NewRequest(http.MethodPut, "/prompt-templates/"+second.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestUpdatePromptTemplate(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID,
		Name:   "Original",
		Body:   "Word: {{TARGET_WORD}}",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	body, _ := json.Marshal(map[string]any{
		"name": "Updated",
		"body": "Phrase: {{SENTENCE}}",
	})
	req := httptest.NewRequest(http.MethodPut, "/prompt-templates/"+created.ID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("update status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var updated map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &updated); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if updated["name"] != "Updated" {
		t.Fatalf("name = %v, want Updated", updated["name"])
	}
	if updated["body"] != "Phrase: {{SENTENCE}}" {
		t.Fatalf("body = %v", updated["body"])
	}
}

func TestDeletePromptTemplate(t *testing.T) {
	svc := newFakePromptTemplateService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID,
		Name:   "Temp",
		Body:   "Word: {{TARGET_WORD}}",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/prompt-templates/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/prompt-templates/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("get after delete status = %d, want 404", rec.Code)
	}
}
