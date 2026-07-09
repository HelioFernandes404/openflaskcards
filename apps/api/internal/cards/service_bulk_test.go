package cards

import (
	"context"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/google/uuid"
)

type fakeBulkQuerier struct {
	deck      db.Deck
	deckErr   error
	created   []db.CreateCardParams
	createErr error
}

func (f *fakeBulkQuerier) GetDeckByID(_ context.Context, _ uuid.UUID) (db.Deck, error) {
	return f.deck, f.deckErr
}

func (f *fakeBulkQuerier) CreateCard(_ context.Context, arg db.CreateCardParams) (db.Card, error) {
	if f.createErr != nil {
		return db.Card{}, f.createErr
	}
	f.created = append(f.created, arg)
	return db.Card{ID: uuid.New(), DeckID: arg.DeckID, Front: arg.Front, Back: arg.Back}, nil
}

func TestBulkCreateCardsCreatesAllValidItems(t *testing.T) {
	deckID := uuid.New()
	userID := uuid.New()
	q := &fakeBulkQuerier{deck: db.Deck{ID: deckID, UserID: userID}}

	out, err := bulkCreateCards(context.Background(), q, fsrs.New(), BulkCreateInput{
		DeckID: deckID, UserID: userID,
		Items: []BulkItemInput{
			{Front: "a", Back: "1"},
			{Front: "b", Back: "2"},
			{Front: "c", Back: "3"},
		},
	})
	if err != nil {
		t.Fatalf("bulkCreateCards: %v", err)
	}
	if out.Created != 3 {
		t.Errorf("Created = %d, want 3", out.Created)
	}
	if len(out.Errors) != 0 {
		t.Errorf("Errors = %v, want none", out.Errors)
	}
	if len(q.created) != 3 {
		t.Errorf("expected 3 CreateCard calls, got %d", len(q.created))
	}
}

func TestBulkCreateCardsRejectsForeignDeck(t *testing.T) {
	deckID := uuid.New()
	owner := uuid.New()
	attacker := uuid.New()
	q := &fakeBulkQuerier{deck: db.Deck{ID: deckID, UserID: owner}}

	_, err := bulkCreateCards(context.Background(), q, fsrs.New(), BulkCreateInput{
		DeckID: deckID, UserID: attacker,
		Items: []BulkItemInput{{Front: "a", Back: "1"}},
	})
	if err != apperror.ErrDeckNotFound {
		t.Errorf("expected ErrDeckNotFound, got %v", err)
	}
	if len(q.created) != 0 {
		t.Errorf("expected no cards created for a deck owned by another user, got %d", len(q.created))
	}
}

func TestBulkCreateCardsSkipsInvalidRowsWhenOptionSet(t *testing.T) {
	deckID := uuid.New()
	userID := uuid.New()
	q := &fakeBulkQuerier{deck: db.Deck{ID: deckID, UserID: userID}}

	out, err := bulkCreateCards(context.Background(), q, fsrs.New(), BulkCreateInput{
		DeckID: deckID, UserID: userID,
		Items: []BulkItemInput{
			{Front: "a", Back: "1"},
			{Front: "   ", Back: "2"}, // blank after trim
			{Front: "c", Back: "3"},
		},
		Options: BulkOptions{SkipInvalidRows: true, TrimWhitespace: true},
	})
	if err != nil {
		t.Fatalf("bulkCreateCards: %v", err)
	}
	if out.Created != 2 {
		t.Errorf("Created = %d, want 2", out.Created)
	}
	if len(out.Errors) != 1 || out.Errors[0].Index != 1 {
		t.Errorf("Errors = %v, want one error at index 1", out.Errors)
	}
}

func TestBulkCreateCardsAbortsOnInvalidRowWithoutSkipOption(t *testing.T) {
	deckID := uuid.New()
	userID := uuid.New()
	q := &fakeBulkQuerier{deck: db.Deck{ID: deckID, UserID: userID}}

	_, err := bulkCreateCards(context.Background(), q, fsrs.New(), BulkCreateInput{
		DeckID: deckID, UserID: userID,
		Items: []BulkItemInput{
			{Front: "a", Back: "1"},
			{Front: "", Back: "2"},
			{Front: "c", Back: "3"},
		},
	})
	if err == nil {
		t.Fatal("expected an error when a row is invalid and skipInvalidRows is not set")
	}
}

func TestBulkCreateCardsFailsWhenAllRowsInvalid(t *testing.T) {
	deckID := uuid.New()
	userID := uuid.New()
	q := &fakeBulkQuerier{deck: db.Deck{ID: deckID, UserID: userID}}

	_, err := bulkCreateCards(context.Background(), q, fsrs.New(), BulkCreateInput{
		DeckID: deckID, UserID: userID,
		Items: []BulkItemInput{
			{Front: "  ", Back: "1"},
			{Front: "  ", Back: "2"},
		},
		Options: BulkOptions{SkipInvalidRows: true, TrimWhitespace: true},
	})
	if err == nil {
		t.Fatal("expected an error when every row fails validation, so the API never returns 200 with 0 created")
	}
}

func TestBulkCreateCardsAppliesTrimWhitespace(t *testing.T) {
	deckID := uuid.New()
	userID := uuid.New()
	q := &fakeBulkQuerier{deck: db.Deck{ID: deckID, UserID: userID}}

	_, err := bulkCreateCards(context.Background(), q, fsrs.New(), BulkCreateInput{
		DeckID: deckID, UserID: userID,
		Items:   []BulkItemInput{{Front: "  hello  ", Back: "  world  "}},
		Options: BulkOptions{TrimWhitespace: true},
	})
	if err != nil {
		t.Fatalf("bulkCreateCards: %v", err)
	}
	if len(q.created) != 1 {
		t.Fatalf("expected 1 CreateCard call, got %d", len(q.created))
	}
	if q.created[0].Front != "hello" || q.created[0].Back != "world" {
		t.Errorf("expected trimmed front/back, got %q/%q", q.created[0].Front, q.created[0].Back)
	}
}
