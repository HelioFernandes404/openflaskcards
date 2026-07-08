package studyplans

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestGetStudyPlanProgressReturnsEmptyForNewPlan(t *testing.T) {
	svc := newFakeStudyPlanService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "Daily English",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/study-plans/"+created.ID.String()+"/progress", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	sessions, ok := out["sessions"].(map[string]any)
	if !ok || len(sessions) != 0 {
		t.Fatalf("sessions = %v, want empty object", out["sessions"])
	}
	if out["totalXp"] != float64(0) {
		t.Fatalf("totalXp = %v, want 0", out["totalXp"])
	}
	if out["longestStreak"] != float64(0) {
		t.Fatalf("longestStreak = %v, want 0", out["longestStreak"])
	}
}

func TestSaveStudyPlanProgressPersistsSessionsAndXp(t *testing.T) {
	svc := newFakeStudyPlanService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "Daily English",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	body, _ := json.Marshal(map[string]any{
		"sessions":       map[string]any{"2026-07-02": []int{1, 2}},
		"totalXp":        45,
		"longestStreak":  3,
	})
	req := httptest.NewRequest(http.MethodPut, "/study-plans/"+created.ID.String()+"/progress", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("save status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/study-plans/"+created.ID.String()+"/progress", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("get status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out["totalXp"] != float64(45) {
		t.Fatalf("totalXp = %v, want 45", out["totalXp"])
	}
	if out["longestStreak"] != float64(3) {
		t.Fatalf("longestStreak = %v, want 3", out["longestStreak"])
	}
	sessions, ok := out["sessions"].(map[string]any)
	if !ok {
		t.Fatalf("sessions = %v, want object", out["sessions"])
	}
	day, ok := sessions["2026-07-02"].([]any)
	if !ok || len(day) != 2 {
		t.Fatalf("sessions[2026-07-02] = %v, want [1,2]", sessions["2026-07-02"])
	}
}

func TestGetStudyPlanProgressForbiddenForOtherUser(t *testing.T) {
	svc := newFakeStudyPlanService()
	ownerID := uuid.New()
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: ownerID, Title: "Private Plan",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupRouter(t, svc)
	req := httptest.NewRequest(http.MethodGet, "/study-plans/"+created.ID.String()+"/progress", nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestListStudyPlansIncludesProgress(t *testing.T) {
	svc := newFakeStudyPlanService()
	r, jwt, userID := setupRouter(t, svc)
	created, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "Plan with progress",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	body, _ := json.Marshal(map[string]any{
		"sessions":      map[string]any{"2026-07-02": []int{1}},
		"totalXp":       10,
		"longestStreak": 1,
	})
	req := httptest.NewRequest(http.MethodPut, "/study-plans/"+created.ID.String()+"/progress", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("save status = %d, body = %s", rec.Code, rec.Body.String())
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
	progress, ok := out[0]["progress"].(map[string]any)
	if !ok {
		t.Fatalf("progress = %v, want object", out[0]["progress"])
	}
	if progress["totalXp"] != float64(10) {
		t.Fatalf("progress.totalXp = %v, want 10", progress["totalXp"])
	}
}
