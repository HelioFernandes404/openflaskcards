package cards

import (
	"context"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

type fakeDeckLocker struct {
	deck        db.Deck
	studiedByID map[uuid.UUID]int64
	lockCalls   int
}

func (f *fakeDeckLocker) GetDeckByIDForUpdate(_ context.Context, id uuid.UUID) (db.Deck, error) {
	f.lockCalls++
	if id != f.deck.ID {
		return db.Deck{}, apperror.ErrDeckNotFound
	}
	return f.deck, nil
}

func (f *fakeDeckLocker) CountNewCardsStudiedToday(_ context.Context, arg db.CountNewCardsStudiedTodayParams) (int64, error) {
	return f.studiedByID[arg.UserID], nil
}

func TestNewCardsQuotaForUpdateLocksDeckAndReturnsStudiedCount(t *testing.T) {
	deckID := uuid.New()
	userID := uuid.New()
	locker := &fakeDeckLocker{
		deck:        db.Deck{ID: deckID, NewCardsDailyLimit: 20},
		studiedByID: map[uuid.UUID]int64{userID: 7},
	}

	studied, limit, err := newCardsQuotaForUpdate(context.Background(), locker, deckID, userID)
	if err != nil {
		t.Fatalf("newCardsQuotaForUpdate: %v", err)
	}
	if studied != 7 {
		t.Errorf("studied = %d, want 7", studied)
	}
	if limit != 20 {
		t.Errorf("limit = %d, want 20", limit)
	}
	if locker.lockCalls != 1 {
		t.Errorf("expected the deck row to be locked via GetDeckByIDForUpdate, lockCalls = %d", locker.lockCalls)
	}
}

type fakeUserFSRSReader struct {
	user db.User
	err  error
}

func (f *fakeUserFSRSReader) GetUserByID(_ context.Context, _ uuid.UUID) (db.User, error) {
	return f.user, f.err
}

func TestSchedulerForUserLogsAndFallsBackWhenUserLookupFails(t *testing.T) {
	core, logs := observer.New(zap.WarnLevel)
	log := zap.New(core)
	fallback := fsrs.New()

	got := schedulerForUser(context.Background(), &fakeUserFSRSReader{err: apperror.ErrUserNotFound}, uuid.New(), fallback, log)

	if got != fallback {
		t.Error("expected the global fallback scheduler when the user lookup fails")
	}
	if logs.Len() != 1 {
		t.Fatalf("expected 1 warning log about the fallback, got %d", logs.Len())
	}
}

func TestSchedulerForUserLogsAndFallsBackWhenStoredParamsAreInvalid(t *testing.T) {
	core, logs := observer.New(zap.WarnLevel)
	log := zap.New(core)
	fallback := fsrs.New()

	got := schedulerForUser(context.Background(), &fakeUserFSRSReader{
		user: db.User{FsrsParameters: []float64{0.1, 0.2}}, // wrong length, corrupted data
	}, uuid.New(), fallback, log)

	if got != fallback {
		t.Error("expected the global fallback scheduler when stored parameters are invalid")
	}
	if logs.Len() != 1 {
		t.Fatalf("expected 1 warning log about the fallback, got %d", logs.Len())
	}
}

func TestSchedulerForUserUsesStoredParamsWithoutLogging(t *testing.T) {
	core, logs := observer.New(zap.WarnLevel)
	log := zap.New(core)
	fallback := fsrs.New()
	weights := make([]float64, 21)

	got := schedulerForUser(context.Background(), &fakeUserFSRSReader{
		user: db.User{FsrsParameters: weights, DesiredRetention: 0.9},
	}, uuid.New(), fallback, log)

	if got == fallback {
		t.Error("expected a per-user scheduler built from the stored parameters, not the fallback")
	}
	if logs.Len() != 0 {
		t.Errorf("expected no warning logs on the happy path, got %d", logs.Len())
	}
}

func TestNewCardsQuotaForUpdatePropagatesUnknownDeck(t *testing.T) {
	locker := &fakeDeckLocker{deck: db.Deck{ID: uuid.New()}, studiedByID: map[uuid.UUID]int64{}}

	_, _, err := newCardsQuotaForUpdate(context.Background(), locker, uuid.New(), uuid.New())
	if err != apperror.ErrDeckNotFound {
		t.Errorf("expected ErrDeckNotFound, got %v", err)
	}
}

func TestCapNewCardsInDueList(t *testing.T) {
	deckID := uuid.New()
	mk := func(state string) Card {
		return Card{ID: uuid.New(), DeckID: deckID, State: state}
	}
	cards := []Card{
		mk("review"),
		mk("new"),
		mk("new"),
		mk("learning"),
		mk("new"),
		mk("new"),
	}

	t.Run("caps new cards to remaining quota", func(t *testing.T) {
		got := capNewCardsInDueList(cards, 2)
		if len(got) != 4 {
			t.Fatalf("len(got) = %d, want 4", len(got))
		}
		var newCount int
		for _, card := range got {
			if card.State == "new" {
				newCount++
			}
		}
		if newCount != 2 {
			t.Fatalf("newCount = %d, want 2", newCount)
		}
	})

	t.Run("drops all new cards when remaining is zero", func(t *testing.T) {
		got := capNewCardsInDueList(cards, 0)
		if len(got) != 2 {
			t.Fatalf("len(got) = %d, want 2", len(got))
		}
		for _, card := range got {
			if card.State == "new" {
				t.Fatalf("unexpected new card in result")
			}
		}
	})
}
