package letters

import (
	"context"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type fakeQuerier struct {
	letters map[uuid.UUID]db.Letter
	decks   map[uuid.UUID]db.Deck
}

func newFakeQuerier() *fakeQuerier {
	return &fakeQuerier{letters: map[uuid.UUID]db.Letter{}, decks: map[uuid.UUID]db.Deck{}}
}

func (f *fakeQuerier) CreateLetter(_ context.Context, arg db.CreateLetterParams) (db.Letter, error) {
	l := db.Letter{
		ID: uuid.New(), UserID: arg.UserID, Title: arg.Title, Artist: arg.Artist,
		OriginalLyrics: arg.OriginalLyrics, Translation: arg.Translation, DeckID: arg.DeckID,
	}
	f.letters[l.ID] = l
	return l, nil
}

func (f *fakeQuerier) ListLettersByUser(_ context.Context, userID uuid.UUID) ([]db.Letter, error) {
	out := make([]db.Letter, 0)
	for _, l := range f.letters {
		if l.UserID == userID {
			out = append(out, l)
		}
	}
	return out, nil
}

func (f *fakeQuerier) GetLetterByID(_ context.Context, id uuid.UUID) (db.Letter, error) {
	l, ok := f.letters[id]
	if !ok {
		return db.Letter{}, pgx.ErrNoRows
	}
	return l, nil
}

func (f *fakeQuerier) UpdateLetter(_ context.Context, arg db.UpdateLetterParams) (db.Letter, error) {
	l, ok := f.letters[arg.ID]
	if !ok {
		return db.Letter{}, pgx.ErrNoRows
	}
	if arg.Title != nil {
		l.Title = *arg.Title
	}
	if arg.Artist != nil {
		l.Artist = *arg.Artist
	}
	if arg.OriginalLyrics != nil {
		l.OriginalLyrics = *arg.OriginalLyrics
	}
	if arg.Translation != nil {
		l.Translation = *arg.Translation
	}
	if arg.DeckIDSet != nil && *arg.DeckIDSet {
		l.DeckID = arg.DeckID
	}
	f.letters[arg.ID] = l
	return l, nil
}

func (f *fakeQuerier) DeleteLetter(_ context.Context, arg db.DeleteLetterParams) error {
	delete(f.letters, arg.ID)
	return nil
}

func (f *fakeQuerier) GetDeckByID(_ context.Context, id uuid.UUID) (db.Deck, error) {
	d, ok := f.decks[id]
	if !ok {
		return db.Deck{}, pgx.ErrNoRows
	}
	return d, nil
}

func newTestService() (*Service, *fakeQuerier) {
	q := newFakeQuerier()
	return &Service{q: q}, q
}

func TestCreateAllowsDeckOwnedByUser(t *testing.T) {
	svc, q := newTestService()
	userID := uuid.New()
	deckID := uuid.New()
	q.decks[deckID] = db.Deck{ID: deckID, UserID: userID}

	_, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "T", Artist: "A", DeckID: &deckID,
	})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
}

func TestCreateRejectsDeckOwnedByAnotherUser(t *testing.T) {
	svc, q := newTestService()
	owner := uuid.New()
	attacker := uuid.New()
	deckID := uuid.New()
	q.decks[deckID] = db.Deck{ID: deckID, UserID: owner}

	_, err := svc.Create(context.Background(), CreateInput{
		UserID: attacker, Title: "T", Artist: "A", DeckID: &deckID,
	})
	if err != apperror.ErrDeckNotFound {
		t.Errorf("expected ErrDeckNotFound when deckId belongs to another user, got %v", err)
	}
}

func TestCreateRejectsNonexistentDeck(t *testing.T) {
	svc, _ := newTestService()
	userID := uuid.New()
	deckID := uuid.New()

	_, err := svc.Create(context.Background(), CreateInput{
		UserID: userID, Title: "T", Artist: "A", DeckID: &deckID,
	})
	if err != apperror.ErrDeckNotFound {
		t.Errorf("expected ErrDeckNotFound for unknown deckId, got %v", err)
	}
}

func TestCreateWithoutDeckIDSucceeds(t *testing.T) {
	svc, _ := newTestService()
	_, err := svc.Create(context.Background(), CreateInput{
		UserID: uuid.New(), Title: "T", Artist: "A",
	})
	if err != nil {
		t.Fatalf("Create without deckId should not require ownership check: %v", err)
	}
}

func TestUpdateRejectsDeckOwnedByAnotherUser(t *testing.T) {
	svc, q := newTestService()
	owner := uuid.New()
	attacker := uuid.New()
	otherDeckID := uuid.New()
	q.decks[otherDeckID] = db.Deck{ID: otherDeckID, UserID: owner}

	letter, err := svc.Create(context.Background(), CreateInput{UserID: attacker, Title: "T", Artist: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	_, err = svc.Update(context.Background(), letter.ID, attacker, UpdateInput{
		DeckIDSet: true, DeckID: &otherDeckID,
	})
	if err != apperror.ErrDeckNotFound {
		t.Errorf("expected ErrDeckNotFound when re-pointing letter to another user's deck, got %v", err)
	}
}

func TestUpdateAllowsDeckOwnedByUser(t *testing.T) {
	svc, q := newTestService()
	userID := uuid.New()
	deckID := uuid.New()
	q.decks[deckID] = db.Deck{ID: deckID, UserID: userID}

	letter, err := svc.Create(context.Background(), CreateInput{UserID: userID, Title: "T", Artist: "A"})
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	updated, err := svc.Update(context.Background(), letter.ID, userID, UpdateInput{
		DeckIDSet: true, DeckID: &deckID,
	})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.DeckID == nil || *updated.DeckID != deckID {
		t.Errorf("expected letter deckId to be updated to %v, got %v", deckID, updated.DeckID)
	}
}
