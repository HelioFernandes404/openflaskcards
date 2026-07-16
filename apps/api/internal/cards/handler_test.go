package cards

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

// fakeCardsService is an in-memory implementation of cardsServicer used to
// exercise the HTTP handlers without a real database.
type fakeCardsService struct {
	cards          map[uuid.UUID]Card
	deckOwner      map[uuid.UUID]uuid.UUID
	audio          string
	audioErr       error
	reviewErr      error
	previewErr     error
	fsrsDebugErr   error
	synthesizeText string
	synthesizeErr  error
}

func newFakeCardsService() *fakeCardsService {
	return &fakeCardsService{
		cards:     map[uuid.UUID]Card{},
		deckOwner: map[uuid.UUID]uuid.UUID{},
	}
}

func (f *fakeCardsService) registerDeck(deckID, ownerID uuid.UUID) {
	f.deckOwner[deckID] = ownerID
}

func (f *fakeCardsService) Create(_ context.Context, in CreateInput) (Card, error) {
	owner, ok := f.deckOwner[in.DeckID]
	if !ok {
		return Card{}, apperror.ErrDeckNotFound
	}
	if owner != in.UserID {
		return Card{}, apperror.ErrForbidden
	}
	c := Card{
		ID: uuid.New(), DeckID: in.DeckID,
		Front: in.Front, Back: in.Back,
		AudioURL: in.AudioURL, ImagemURL: in.ImagemURL, Phonetic: in.Phonetic,
		TTSEnabled: in.TTSEnabled,
		State:      "new",
		Due:        time.Now().UTC(),
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}
	f.cards[c.ID] = c
	return c, nil
}

func (f *fakeCardsService) GetByID(_ context.Context, id, userID uuid.UUID) (Card, error) {
	c, ok := f.cards[id]
	if !ok {
		return Card{}, apperror.ErrCardNotFound
	}
	if f.deckOwner[c.DeckID] != userID {
		return Card{}, apperror.ErrForbidden
	}
	return c, nil
}

func (f *fakeCardsService) ListByDeck(_ context.Context, deckID, userID uuid.UUID) ([]Card, error) {
	owner, ok := f.deckOwner[deckID]
	if !ok {
		return nil, apperror.ErrDeckNotFound
	}
	if owner != userID {
		return nil, apperror.ErrForbidden
	}
	out := make([]Card, 0)
	for _, c := range f.cards {
		if c.DeckID == deckID {
			out = append(out, c)
		}
	}
	return out, nil
}

func (f *fakeCardsService) CountByDeck(ctx context.Context, deckID, userID uuid.UUID) (int64, error) {
	cards, err := f.ListByDeck(ctx, deckID, userID)
	if err != nil {
		return 0, err
	}
	return int64(len(cards)), nil
}

func (f *fakeCardsService) BulkCreate(_ context.Context, in BulkCreateInput) (BulkCreateOutput, error) {
	owner, ok := f.deckOwner[in.DeckID]
	if !ok {
		return BulkCreateOutput{}, apperror.ErrDeckNotFound
	}
	if owner != in.UserID {
		return BulkCreateOutput{}, apperror.ErrForbidden
	}
	errs := make([]BulkItemError, 0)
	created := 0
	for idx, item := range in.Items {
		front, back := item.Front, item.Back
		if in.Options.TrimWhitespace {
			front = strings.TrimSpace(front)
			back = strings.TrimSpace(back)
		}
		if front == "" || back == "" {
			if in.Options.SkipInvalidRows {
				errs = append(errs, BulkItemError{Index: idx, Message: "front and back must not be empty"})
				continue
			}
			return BulkCreateOutput{}, apperror.New("VALIDATION_ERROR", 422, "front and back must not be empty")
		}
		ttsEnabled := true
		if item.TTSEnabled != nil {
			ttsEnabled = *item.TTSEnabled
		}
		c := Card{
			ID: uuid.New(), DeckID: in.DeckID, Front: front, Back: back,
			Phonetic: item.Phonetic, TTSEnabled: ttsEnabled, State: "new",
			Due: time.Now().UTC(), CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC(),
		}
		f.cards[c.ID] = c
		created++
	}
	if created == 0 && len(errs) > 0 {
		return BulkCreateOutput{}, apperror.New("VALIDATION_ERROR", 422, "no cards were created, all rows failed validation")
	}
	return BulkCreateOutput{Created: created, Errors: errs}, nil
}

func (f *fakeCardsService) ListDueByUser(_ context.Context, userID uuid.UUID, limit, offset int32) ([]Card, int64, error) {
	all := make([]Card, 0)
	for _, c := range f.cards {
		if f.deckOwner[c.DeckID] == userID {
			all = append(all, c)
		}
	}
	total := int64(len(all))
	if int32(len(all)) > offset {
		all = all[offset:]
	} else {
		all = nil
	}
	if int32(len(all)) > limit {
		all = all[:limit]
	}
	return all, total, nil
}

func (f *fakeCardsService) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Card, error) {
	c, err := f.GetByID(ctx, id, userID)
	if err != nil {
		return Card{}, err
	}
	if in.Front != nil {
		c.Front = *in.Front
	}
	if in.Back != nil {
		c.Back = *in.Back
	}
	if in.TTSEnabled != nil {
		c.TTSEnabled = *in.TTSEnabled
	}
	c.UpdatedAt = time.Now().UTC()
	f.cards[id] = c
	return c, nil
}

func (f *fakeCardsService) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := f.GetByID(ctx, id, userID); err != nil {
		return err
	}
	delete(f.cards, id)
	return nil
}

func (f *fakeCardsService) Move(ctx context.Context, id, newDeckID, userID uuid.UUID) (Card, error) {
	c, err := f.GetByID(ctx, id, userID)
	if err != nil {
		return Card{}, err
	}
	if f.deckOwner[newDeckID] != userID {
		return Card{}, apperror.ErrForbidden
	}
	c.DeckID = newDeckID
	f.cards[id] = c
	return c, nil
}

func (f *fakeCardsService) SubmitReview(ctx context.Context, in ReviewInput) (ReviewOutput, error) {
	if f.reviewErr != nil {
		return ReviewOutput{}, f.reviewErr
	}
	c, err := f.GetByID(ctx, in.CardID, in.UserID)
	if err != nil {
		return ReviewOutput{}, err
	}
	c.State = "review"
	c.Reps++
	now := time.Now().UTC()
	c.LastReview = &now
	f.cards[in.CardID] = c
	return ReviewOutput{Card: c}, nil
}

func (f *fakeCardsService) DueSummaryByDeck(ctx context.Context, deckID, userID uuid.UUID, limit, offset int32) (DueSummary, error) {
	all, err := f.ListByDeck(ctx, deckID, userID)
	if err != nil {
		return DueSummary{}, err
	}
	total := int64(len(all))
	paged := all
	if int32(len(paged)) > offset {
		paged = paged[offset:]
	} else {
		paged = nil
	}
	if int32(len(paged)) > limit {
		paged = paged[:limit]
	}
	return DueSummary{Cards: paged, TotalDue: total, NewCardsDailyLimit: 20}, nil
}

func (f *fakeCardsService) BrowseFilters(_ context.Context, userID uuid.UUID) (BrowseFilters, error) {
	var total int64
	for _, c := range f.cards {
		if f.deckOwner[c.DeckID] == userID {
			total++
		}
	}
	return BrowseFilters{TotalCards: total}, nil
}

func (f *fakeCardsService) Browse(_ context.Context, userID uuid.UUID, q BrowseQuery) ([]Card, error) {
	out := make([]Card, 0)
	for _, c := range f.cards {
		if f.deckOwner[c.DeckID] != userID {
			continue
		}
		if q.FilterType == "state" && q.FilterValue != "" && c.State != q.FilterValue {
			continue
		}
		out = append(out, c)
	}
	return out, nil
}

func (f *fakeCardsService) PreviewReview(ctx context.Context, id, userID uuid.UUID) (ReviewPreview, error) {
	if f.previewErr != nil {
		return ReviewPreview{}, f.previewErr
	}
	c, err := f.GetByID(ctx, id, userID)
	if err != nil {
		return ReviewPreview{}, err
	}
	return ReviewPreview{CardID: c.ID}, nil
}

func (f *fakeCardsService) FSRSDebug(ctx context.Context, id, userID uuid.UUID) (FSRSDebugResult, error) {
	if f.fsrsDebugErr != nil {
		return FSRSDebugResult{}, f.fsrsDebugErr
	}
	if _, err := f.GetByID(ctx, id, userID); err != nil {
		return FSRSDebugResult{}, err
	}
	return FSRSDebugResult{}, nil
}

func (f *fakeCardsService) GetAudio(ctx context.Context, cardID, userID uuid.UUID) (string, error) {
	if f.audioErr != nil {
		return "", f.audioErr
	}
	if _, err := f.GetByID(ctx, cardID, userID); err != nil {
		return "", err
	}
	return f.audio, nil
}

func (f *fakeCardsService) SynthesizeText(_ context.Context, _ string) (string, error) {
	if f.synthesizeErr != nil {
		return "", f.synthesizeErr
	}
	return f.synthesizeText, nil
}

func setupCardsRouter(t *testing.T, svc cardsServicer) (*gin.Engine, *fakeJWT, uuid.UUID) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	userID := auth.DefaultUserID
	h := newHandlerWithService(svc)
	r := gin.New()
	h.RegisterCardRoutes(r.Group("/cards"))
	h.RegisterDeckCardRoutes(r.Group("/decks"))
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

func TestCreateCardRejectsMissingFront(t *testing.T) {
	svc := newFakeCardsService()
	r, jwt, userID := setupCardsRouter(t, svc)
	deckID := uuid.New()
	svc.registerDeck(deckID, userID)
	body, _ := json.Marshal(map[string]any{"deckId": deckID.String(), "back": "b"})
	req := authedRequest(http.MethodPost, "/cards", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateCardRejectsUnknownDeck(t *testing.T) {
	svc := newFakeCardsService()
	r, jwt, userID := setupCardsRouter(t, svc)
	body, _ := json.Marshal(map[string]any{"deckId": uuid.New().String(), "front": "f", "back": "b"})
	req := authedRequest(http.MethodPost, "/cards", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateAndGetCard(t *testing.T) {
	svc := newFakeCardsService()
	r, jwt, userID := setupCardsRouter(t, svc)
	deckID := uuid.New()
	svc.registerDeck(deckID, userID)
	body, _ := json.Marshal(map[string]any{"deckId": deckID.String(), "front": "Hola", "back": "Hello"})
	req := authedRequest(http.MethodPost, "/cards", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var created map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode: %v", err)
	}

	req = authedRequest(http.MethodGet, "/cards/"+created["id"].(string), nil, tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("get status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestGetCardForbiddenForOtherUser(t *testing.T) {
	svc := newFakeCardsService()
	ownerID := uuid.New()
	deckID := uuid.New()
	svc.registerDeck(deckID, ownerID)
	created, err := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: ownerID, Front: "f", Back: "b"})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	r, jwt, otherUser := setupCardsRouter(t, svc)
	req := authedRequest(http.MethodGet, "/cards/"+created.ID.String(), nil, tokenFor(t, jwt, otherUser))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestGetCardNotFoundForInvalidID(t *testing.T) {
	r, jwt, userID := setupCardsRouter(t, newFakeCardsService())
	req := authedRequest(http.MethodGet, "/cards/not-a-uuid", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestUpdateCard(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})

	body, _ := json.Marshal(map[string]any{"front": "updated front"})
	req := authedRequest(http.MethodPut, "/cards/"+created.ID.String(), body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("update status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["front"] != "updated front" {
		t.Fatalf("front = %v, want %q", out["front"], "updated front")
	}
}

func TestDeleteCard(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})

	req := authedRequest(http.MethodDelete, "/cards/"+created.ID.String(), nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestMoveCardToDeckOwnedByAnotherUserIsForbidden(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	otherDeckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.registerDeck(otherDeckID, uuid.New())
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})

	body, _ := json.Marshal(map[string]any{"deckId": otherDeckID.String()})
	req := authedRequest(http.MethodPatch, "/cards/"+created.ID.String()+"/move", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403, body = %s", rec.Code, rec.Body.String())
	}
}

func TestReviewCardRejectsInvalidRating(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})

	body, _ := json.Marshal(map[string]any{"rating": 9})
	req := authedRequest(http.MethodPost, "/cards/"+created.ID.String()+"/review", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestReviewCardAppliesRatingAndReturnsUpdatedState(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})

	body, _ := json.Marshal(map[string]any{"rating": 3})
	req := authedRequest(http.MethodPost, "/cards/"+created.ID.String()+"/review", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["state"] != "review" {
		t.Fatalf("state = %v, want review", out["state"])
	}
	if out["reps"].(float64) != 1 {
		t.Fatalf("reps = %v, want 1", out["reps"])
	}
}

func TestReviewCardPropagatesDailyLimitError(t *testing.T) {
	svc := newFakeCardsService()
	svc.reviewErr = apperror.ErrDailyNewCardsLimit
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})

	body, _ := json.Marshal(map[string]any{"rating": 3})
	req := authedRequest(http.MethodPost, "/cards/"+created.ID.String()+"/review", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409, body = %s", rec.Code, rec.Body.String())
	}
}

func TestListDueCards(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f2", Back: "b2"})

	req := authedRequest(http.MethodGet, "/cards/due", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["totalDue"].(float64) != 2 {
		t.Fatalf("totalDue = %v, want 2", out["totalDue"])
	}
}

func TestDueSummaryForDeck(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/deck/"+deckID.String()+"/due-summary", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["newCardsDailyLimit"].(float64) != 20 {
		t.Fatalf("newCardsDailyLimit = %v, want 20", out["newCardsDailyLimit"])
	}
}

func TestListDueCardsTotalDueReflectsFullCountBeyondLimit(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	for i := 0; i < 3; i++ {
		svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})
	}

	req := authedRequest(http.MethodGet, "/cards/due?limit=2", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	cards := out["cards"].([]any)
	if len(cards) != 2 {
		t.Fatalf("returned %d cards, want 2 (page size)", len(cards))
	}
	if out["totalDue"].(float64) != 3 {
		t.Fatalf("totalDue = %v, want 3 (the real total, not the page size)", out["totalDue"])
	}
}

func TestDueSummaryForDeckTotalDueReflectsFullCountBeyondLimit(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	for i := 0; i < 3; i++ {
		svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f", Back: "b"})
	}

	req := authedRequest(http.MethodGet, "/cards/deck/"+deckID.String()+"/due-summary?limit=2", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	cards := out["cards"].([]any)
	if len(cards) != 2 {
		t.Fatalf("returned %d cards, want 2 (page size)", len(cards))
	}
	if out["totalDue"].(float64) != 3 {
		t.Fatalf("totalDue = %v, want 3 (the real total, not the page size)", out["totalDue"])
	}
}

func TestBrowseFilters(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/browse/filters", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["totalCards"].(float64) != 1 {
		t.Fatalf("totalCards = %v, want 1", out["totalCards"])
	}
}

func TestBrowseCardsByState(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/browse?filterType=state&filterValue=new", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 {
		t.Fatalf("len(out) = %d, want 1", len(out))
	}
}

func TestBulkCreateCardsReportsPerRowErrors(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	otherDeckID := uuid.New()
	svc.registerDeck(otherDeckID, uuid.New())

	body, _ := json.Marshal(map[string]any{
		"deckId": deckID.String(),
		"cards": []map[string]any{
			{"front": "ok front", "back": "ok back"},
		},
	})
	req := authedRequest(http.MethodPost, "/cards/bulk", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["created"].(float64) != 1 {
		t.Fatalf("created = %v, want 1", out["created"])
	}
	if out["failed"].(float64) != 0 {
		t.Fatalf("failed = %v, want 0", out["failed"])
	}
}

func TestBulkCreateCardsHonorsTrimAndSkipOptions(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)

	body, _ := json.Marshal(map[string]any{
		"deckId": deckID.String(),
		"cards": []map[string]any{
			{"front": "  ok front  ", "back": "  ok back  "},
			{"front": "   ", "back": "still has content"},
		},
		"options": map[string]any{
			"trimWhitespace":  true,
			"skipInvalidRows": true,
		},
	})
	req := authedRequest(http.MethodPost, "/cards/bulk", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["created"].(float64) != 1 {
		t.Fatalf("created = %v, want 1", out["created"])
	}
	if out["failed"].(float64) != 1 {
		t.Fatalf("failed = %v, want 1", out["failed"])
	}
}

func TestBulkCreateCardsReturns422WhenAllRowsFailValidation(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)

	body, _ := json.Marshal(map[string]any{
		"deckId": deckID.String(),
		"cards": []map[string]any{
			{"front": "   ", "back": "1"},
			{"front": "   ", "back": "2"},
		},
		"options": map[string]any{
			"trimWhitespace":  true,
			"skipInvalidRows": true,
		},
	})
	req := authedRequest(http.MethodPost, "/cards/bulk", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422 when every row fails and 0 cards are created, body = %s", rec.Code, rec.Body.String())
	}
}

func TestBulkCreateCardsRejectsEmptyCardsList(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)

	body, _ := json.Marshal(map[string]any{
		"deckId": deckID.String(),
		"cards":  []map[string]any{},
	})
	req := authedRequest(http.MethodPost, "/cards/bulk", body, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422, body = %s", rec.Code, rec.Body.String())
	}
}

func TestExportDeck(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/deck/"+deckID.String()+"/export", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 || out[0]["front"] != "f1" {
		t.Fatalf("out = %v", out)
	}
}

func TestPreviewReview(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/"+created.ID.String()+"/preview", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestFSRSDebug(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/"+created.ID.String()+"/fsrs-debug", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestGetFrontAndBack(t *testing.T) {
	svc := newFakeCardsService()
	svc.audio = "base64audio"
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1", TTSEnabled: true})

	req := authedRequest(http.MethodGet, "/cards/"+created.ID.String()+"/front", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("front status = %d, body = %s", rec.Code, rec.Body.String())
	}

	req = authedRequest(http.MethodGet, "/cards/"+created.ID.String()+"/back", nil, tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("back status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["ttsAudio"] != "base64audio" {
		t.Fatalf("ttsAudio = %v, want base64audio", out["ttsAudio"])
	}
}

func TestGetBackEndpointIsBestEffortWhenTTSFails(t *testing.T) {
	svc := newFakeCardsService()
	svc.audioErr = apperror.New("TTS_PROVIDER_DOWN", http.StatusBadGateway, "tts provider unavailable")
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1", TTSEnabled: true})

	req := authedRequest(http.MethodGet, "/cards/"+created.ID.String()+"/back", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (TTS failure must not block the card back), body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["back"] != "b1" {
		t.Errorf("expected card content to still be returned, got back=%v", out["back"])
	}
	if v, ok := out["ttsAudio"]; ok && v != "" {
		t.Errorf("expected ttsAudio to be omitted/empty on TTS failure, got %v", v)
	}
}

func TestAudioEndpointPropagatesServiceError(t *testing.T) {
	svc := newFakeCardsService()
	svc.audioErr = apperror.New("TTS_DISABLED", http.StatusBadRequest, "tts disabled")
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	created, _ := svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})

	req := authedRequest(http.MethodGet, "/cards/"+created.ID.String()+"/audio", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400, body = %s", rec.Code, rec.Body.String())
	}
}

func TestListAndCountCardsByDeck(t *testing.T) {
	svc := newFakeCardsService()
	deckID := uuid.New()
	r, jwt, userID := setupCardsRouter(t, svc)
	svc.registerDeck(deckID, userID)
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f1", Back: "b1"})
	svc.Create(context.Background(), CreateInput{DeckID: deckID, UserID: userID, Front: "f2", Back: "b2"})

	req := authedRequest(http.MethodGet, "/decks/"+deckID.String()+"/cards", nil, tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var list []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &list)
	if len(list) != 2 {
		t.Fatalf("len(list) = %d, want 2", len(list))
	}

	req = authedRequest(http.MethodGet, "/decks/"+deckID.String()+"/cards/count", nil, tokenFor(t, jwt, userID))
	rec = httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("count status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["count"].(float64) != 2 {
		t.Fatalf("count = %v, want 2", out["count"])
	}
}
