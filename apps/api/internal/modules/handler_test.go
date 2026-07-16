package modules

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


type fakeModuleService struct {
	modules map[uuid.UUID]Module
}

func newFakeModuleService() *fakeModuleService {
	return &fakeModuleService{modules: map[uuid.UUID]Module{}}
}

func (f *fakeModuleService) Create(_ context.Context, in CreateInput) (Module, error) {
	promptTypeID, err := normalizePromptModuleTypeID(in.PromptModuleTypeID)
	if err != nil {
		return Module{}, err
	}
	mod := Module{
		ID: uuid.New(), UserID: in.UserID, Name: in.Name,
		Description: in.Description, SortOrder: in.SortOrder,
		PromptModuleTypeID: promptTypeID,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	f.modules[mod.ID] = mod
	return mod, nil
}

func (f *fakeModuleService) ListByUser(_ context.Context, userID uuid.UUID) ([]Module, error) {
	out := make([]Module, 0)
	for _, mod := range f.modules {
		if mod.UserID == userID {
			out = append(out, mod)
		}
	}
	return out, nil
}

func (f *fakeModuleService) GetByID(_ context.Context, id, userID uuid.UUID) (Module, error) {
	mod, ok := f.modules[id]
	if !ok {
		return Module{}, apperror.ErrModuleNotFound
	}
	if mod.UserID != userID {
		return Module{}, apperror.ErrForbidden
	}
	return mod, nil
}

func (f *fakeModuleService) Update(_ context.Context, id, userID uuid.UUID, in UpdateInput) (Module, error) {
	mod, err := f.GetByID(context.Background(), id, userID)
	if err != nil {
		return Module{}, err
	}
	if in.Name != nil {
		mod.Name = *in.Name
	}
	if in.Description != nil {
		mod.Description = in.Description
	}
	if in.SortOrder != nil {
		mod.SortOrder = *in.SortOrder
	}
	if in.PromptModuleTypeID != nil {
		promptTypeID, err := normalizePromptModuleTypeID(in.PromptModuleTypeID)
		if err != nil {
			return Module{}, err
		}
		mod.PromptModuleTypeID = promptTypeID
	}
	mod.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.modules[id] = mod
	return mod, nil
}

func (f *fakeModuleService) Delete(_ context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return err
	}
	delete(f.modules, id)
	return nil
}

func setupRouter(t *testing.T, svc moduleServicer) (*gin.Engine, *fakeJWT, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	userID := auth.DefaultUserID
	h := newHandlerWithService(svc)
	r := gin.New()
	h.RegisterRoutes(r.Group("/modules"))
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

func TestCreateModuleRejectsInvalidPromptType(t *testing.T) {
	svc := newFakeModuleService()
	r, jwt, userID := setupRouter(t, svc)
	invalid := "not-a-real-type"
	body, _ := json.Marshal(map[string]any{
		"name":               "Module 1",
		"promptModuleTypeId": invalid,
	})
	req := httptest.NewRequest(http.MethodPost, "/modules", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndListModules(t *testing.T) {
	svc := newFakeModuleService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"name": "Module 1", "sortOrder": 1})
	req := httptest.NewRequest(http.MethodPost, "/modules", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/modules", nil)
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
		t.Fatalf("modules len = %d, want 1", len(out))
	}
}

func TestGetModuleForbiddenForOtherUser(t *testing.T) {
	svc := newFakeModuleService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: ownerID, Name: "Private Module",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/modules/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestDeleteModule(t *testing.T) {
	svc := newFakeModuleService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Name: "Temp Module",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/modules/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
