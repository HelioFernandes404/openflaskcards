package studyplans

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


type fakeStudyPlanService struct {
	plans    map[uuid.UUID]StudyPlan
	progress map[uuid.UUID]ProgressRecord
}

func newFakeStudyPlanService() *fakeStudyPlanService {
	return &fakeStudyPlanService{
		plans:    map[uuid.UUID]StudyPlan{},
		progress: map[uuid.UUID]ProgressRecord{},
	}
}

func (f *fakeStudyPlanService) Create(_ context.Context, in CreateInput) (StudyPlan, error) {
	p := StudyPlan{
		ID: uuid.New(), UserID: in.UserID, Title: in.Title, Level: in.Level, Goal: in.Goal,
		GoldenRule: in.GoldenRule, Flexibility: in.Flexibility, NoFixedDeadline: in.NoFixedDeadline,
		Steps: in.Steps, Progress: emptyProgressRecord(),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	f.plans[p.ID] = p
	f.progress[p.ID] = emptyProgressRecord()
	return p, nil
}

func (f *fakeStudyPlanService) ListByUser(_ context.Context, userID uuid.UUID) ([]StudyPlan, error) {
	out := make([]StudyPlan, 0)
	for _, p := range f.plans {
		if p.UserID == userID {
			out = append(out, p)
		}
	}
	return out, nil
}

func (f *fakeStudyPlanService) GetByID(_ context.Context, id, userID uuid.UUID) (StudyPlan, error) {
	p, ok := f.plans[id]
	if !ok {
		return StudyPlan{}, apperror.ErrStudyPlanNotFound
	}
	if p.UserID != userID {
		return StudyPlan{}, apperror.ErrForbidden
	}
	return p, nil
}

func (f *fakeStudyPlanService) Update(_ context.Context, id, userID uuid.UUID, in UpdateInput) (StudyPlan, error) {
	p, err := f.GetByID(context.Background(), id, userID)
	if err != nil {
		return StudyPlan{}, err
	}
	if in.Title != nil {
		p.Title = *in.Title
	}
	if in.Level != nil {
		p.Level = *in.Level
	}
	if in.Goal != nil {
		p.Goal = *in.Goal
	}
	if in.GoldenRule != nil {
		p.GoldenRule = *in.GoldenRule
	}
	if in.Flexibility != nil {
		p.Flexibility = *in.Flexibility
	}
	if in.NoFixedDeadline != nil {
		p.NoFixedDeadline = *in.NoFixedDeadline
	}
	if in.StepsProvided {
		p.Steps = in.Steps
	}
	p.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	f.plans[id] = p
	return p, nil
}

func (f *fakeStudyPlanService) Delete(_ context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return err
	}
	delete(f.plans, id)
	delete(f.progress, id)
	return nil
}

func (f *fakeStudyPlanService) GetProgress(_ context.Context, id, userID uuid.UUID) (ProgressRecord, error) {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return ProgressRecord{}, err
	}
	record, ok := f.progress[id]
	if !ok {
		return emptyProgressRecord(), nil
	}
	return record, nil
}

func (f *fakeStudyPlanService) SaveProgress(_ context.Context, id, userID uuid.UUID, in ProgressRecord) (ProgressRecord, error) {
	if _, err := f.GetByID(context.Background(), id, userID); err != nil {
		return ProgressRecord{}, err
	}
	if in.Sessions == nil {
		in.Sessions = map[string][]int{}
	}
	f.progress[id] = in
	p := f.plans[id]
	p.Progress = in
	f.plans[id] = p
	return in, nil
}

func setupRouter(t *testing.T, svc studyPlanServicer) (*gin.Engine, *fakeJWT, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	userID := auth.DefaultUserID
	h := newHandlerWithService(svc)
	r := gin.New()
	h.RegisterRoutes(r.Group("/study-plans"))
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

func TestCreateStudyPlanRejectsEmptyTitle(t *testing.T) {
	svc := newFakeStudyPlanService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"title": ""})
	req := httptest.NewRequest(http.MethodPost, "/study-plans", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndListStudyPlansWithSteps(t *testing.T) {
	svc := newFakeStudyPlanService()
	r, jwt, userID := setupRouter(t, svc)
	body, _ := json.Marshal(map[string]any{
		"title": "English B1->B2",
		"level": "B1 advancing to B2",
		"goal":  "work/career",
		"steps": []map[string]any{
			{"order": 1, "activity": "Flashcards", "duration": "10-15 min", "notes": "always first"},
		},
	})
	req := httptest.NewRequest(http.MethodPost, "/study-plans", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/study-plans", nil)
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
		t.Fatalf("plans len = %d, want 1", len(out))
	}
	steps, ok := out[0]["steps"].([]any)
	if !ok || len(steps) != 1 {
		t.Fatalf("steps = %v, want 1 step", out[0]["steps"])
	}
}

func TestGetStudyPlanForbiddenForOtherUser(t *testing.T) {
	svc := newFakeStudyPlanService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: ownerID, Title: "Private Plan",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/study-plans/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestDeleteStudyPlan(t *testing.T) {
	svc := newFakeStudyPlanService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "Temp Plan",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/study-plans/"+created.ID.String(), nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
