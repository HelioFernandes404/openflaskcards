package cards

import (
	"context"
	"errors"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"go.uber.org/zap"
)

type ReviewInput struct {
	CardID           uuid.UUID
	UserID           uuid.UUID
	Rating           int
	ReviewDurationMs *int32
}

type ReviewOutput struct {
	Card Card
}

// schedulerFor returns a per-user Scheduler built from the user's stored FSRS
// parameters. Falls back to the global scheduler if the user record is
// unavailable or has no custom parameters.
func (s *Service) schedulerFor(ctx context.Context, userID uuid.UUID) *fsrs.Scheduler {
	return schedulerForUser(ctx, s.q, userID, s.fsrs, s.log)
}

type userFSRSReader interface {
	GetUserByID(ctx context.Context, id uuid.UUID) (db.User, error)
}

// schedulerForUser builds a per-user Scheduler from stored FSRS parameters.
// Every fallback path is logged, since a silent fallback means reviews get
// scheduled with default weights instead of the user's optimized ones —
// previously indistinguishable from someone who never optimized at all.
func schedulerForUser(ctx context.Context, q userFSRSReader, userID uuid.UUID, fallback *fsrs.Scheduler, log *zap.Logger) *fsrs.Scheduler {
	u, err := q.GetUserByID(ctx, userID)
	if err != nil {
		log.Warn("fsrs: falling back to default scheduler, could not load user",
			zap.String("user_id", userID.String()), zap.Error(err))
		return fallback
	}
	if len(u.FsrsParameters) > 0 {
		sched, err := fsrs.NewWithParameters(u.FsrsParameters, u.DesiredRetention)
		if err != nil {
			log.Warn("fsrs: falling back to default scheduler, stored parameters are invalid",
				zap.String("user_id", userID.String()), zap.Error(err))
			return fallback
		}
		return sched
	}
	if u.DesiredRetention > 0 {
		sched, err := fsrs.NewWithParameters(nil, u.DesiredRetention)
		if err != nil {
			log.Warn("fsrs: falling back to default scheduler, invalid desired retention",
				zap.String("user_id", userID.String()), zap.Error(err))
			return fallback
		}
		return sched
	}
	return fallback
}

// loadFSRSCard parses the card's persisted FSRS state, or returns a fresh
// card if none has been recorded yet.
func (s *Service) loadFSRSCard(card Card) (fsrs.Card, error) {
	if card.FsrsCardJSON == nil || *card.FsrsCardJSON == "" {
		return s.fsrs.NewCard(), nil
	}
	return s.fsrs.UnmarshalCard([]byte(*card.FsrsCardJSON))
}

func (s *Service) SubmitReview(ctx context.Context, in ReviewInput) (ReviewOutput, error) {
	card, err := s.GetByID(ctx, in.CardID, in.UserID)
	if err != nil {
		return ReviewOutput{}, err
	}

	scheduler := s.schedulerFor(ctx, in.UserID)

	fsrsCard, err := s.loadFSRSCard(card)
	if err != nil {
		return ReviewOutput{}, err
	}

	now := time.Now().UTC()
	updated, err := scheduler.Next(fsrsCard, now, fsrs.Rating(in.Rating))
	if err != nil {
		return ReviewOutput{}, err
	}

	js, err := scheduler.MarshalCard(updated)
	if err != nil {
		return ReviewOutput{}, err
	}
	jsStr := string(js)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return ReviewOutput{}, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	// Quota check happens inside the transaction, against a row-locked deck,
	// so two concurrent reviews of "new" cards can't both read the same
	// studied-today count and both slip past NewCardsDailyLimit.
	if card.State == "new" {
		studied, limit, quotaErr := newCardsQuotaForUpdate(ctx, qtx, card.DeckID, in.UserID)
		if quotaErr != nil {
			return ReviewOutput{}, quotaErr
		}
		if studied >= int64(limit) {
			return ReviewOutput{}, apperror.ErrDailyNewCardsLimit
		}
	}

	row, err := qtx.UpdateCardAfterReview(ctx, db.UpdateCardAfterReviewParams{
		ID:           in.CardID,
		State:        updated.State,
		Stability:    updated.Stability,
		Difficulty:   updated.Difficulty,
		Due:          updated.Due,
		LastReview:   &now,
		Reps:         int32(updated.Reps),
		Lapses:       int32(updated.Lapses),
		FsrsCardJson: &jsStr,
		RowVersion:   card.RowVersion,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ReviewOutput{}, apperror.ErrRowVersionConflict
		}
		return ReviewOutput{}, err
	}

	if _, err := qtx.CreateReview(ctx, db.CreateReviewParams{
		CardID:           in.CardID,
		UserID:           in.UserID,
		Rating:           int32(in.Rating),
		State:            updated.State,
		ScheduledDays:    int32(updated.ScheduledDays),
		ElapsedDays:      int32(updated.ElapsedDays),
		ReviewDatetime:   now,
		ReviewDurationMs: in.ReviewDurationMs,
		Stability:        updated.Stability,
		Difficulty:       updated.Difficulty,
	}); err != nil {
		return ReviewOutput{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return ReviewOutput{}, err
	}
	return ReviewOutput{Card: mapCard(row)}, nil
}

type DueSummary struct {
	Cards                  []Card
	TotalDue               int64
	NewCardsDailyLimit     int32
	NewCardsStudiedToday   int64
	RemainingNewCardsToday int64
	IsNewCardsLimitReached bool
}

func (s *Service) DueSummaryByDeck(ctx context.Context, deckID, userID uuid.UUID, limit, offset int32) (DueSummary, error) {
	deck, err := s.q.GetDeckByID(ctx, deckID)
	if err != nil {
		return DueSummary{}, apperror.ErrDeckNotFound
	}
	if deck.UserID != userID {
		return DueSummary{}, apperror.ErrForbidden
	}
	if limit <= 0 {
		limit = 200
	}
	now := time.Now().UTC()
	rows, err := s.q.ListDueCardsByDeck(ctx, db.ListDueCardsByDeckParams{
		DeckID: deckID, Due: now, Limit: limit, Offset: offset,
	})
	if err != nil {
		return DueSummary{}, err
	}
	totalDue, err := s.q.CountDueCardsByDeck(ctx, db.CountDueCardsByDeckParams{
		DeckID: deckID, Due: now,
	})
	if err != nil {
		return DueSummary{}, err
	}
	cards := make([]Card, 0, len(rows))
	for _, r := range rows {
		cards = append(cards, mapCard(r))
	}
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	studied, err := s.q.CountNewCardsStudiedToday(ctx, db.CountNewCardsStudiedTodayParams{
		DeckID: deckID, UserID: userID, ReviewDatetime: startOfDay,
	})
	if err != nil {
		return DueSummary{}, err
	}
	remaining := int64(deck.NewCardsDailyLimit) - studied
	if remaining < 0 {
		remaining = 0
	}

	filtered := capNewCardsInDueList(cards, remaining)

	return DueSummary{
		Cards:                  filtered,
		TotalDue:               totalDue,
		NewCardsDailyLimit:     deck.NewCardsDailyLimit,
		NewCardsStudiedToday:   studied,
		RemainingNewCardsToday: remaining,
		IsNewCardsLimitReached: remaining == 0,
	}, nil
}

// deckLocker narrows *db.Queries to what newCardsQuotaForUpdate needs, so
// the quota math can be unit tested without a real Postgres transaction.
type deckLocker interface {
	GetDeckByIDForUpdate(ctx context.Context, id uuid.UUID) (db.Deck, error)
	CountNewCardsStudiedToday(ctx context.Context, arg db.CountNewCardsStudiedTodayParams) (int64, error)
}

// newCardsQuotaForUpdate locks the deck row (SELECT ... FOR UPDATE) so the
// studied-today count it reads can't be raced by a concurrent review in the
// same deck.
func newCardsQuotaForUpdate(ctx context.Context, q deckLocker, deckID, userID uuid.UUID) (studied int64, limit int32, err error) {
	deck, err := q.GetDeckByIDForUpdate(ctx, deckID)
	if err != nil {
		return 0, 0, apperror.ErrDeckNotFound
	}
	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	studied, err = q.CountNewCardsStudiedToday(ctx, db.CountNewCardsStudiedTodayParams{
		DeckID: deckID, UserID: userID, ReviewDatetime: startOfDay,
	})
	if err != nil {
		return 0, 0, err
	}
	return studied, deck.NewCardsDailyLimit, nil
}

// capNewCardsInDueList keeps all non-new due cards and at most remaining new cards.
func capNewCardsInDueList(cards []Card, remaining int64) []Card {
	if len(cards) == 0 {
		return cards
	}
	if remaining <= 0 {
		filtered := make([]Card, 0, len(cards))
		for _, card := range cards {
			if card.State != "new" {
				filtered = append(filtered, card)
			}
		}
		return filtered
	}
	filtered := make([]Card, 0, len(cards))
	var newAdded int64
	for _, card := range cards {
		if card.State == "new" {
			if newAdded >= remaining {
				continue
			}
			newAdded++
		}
		filtered = append(filtered, card)
	}
	return filtered
}

func (s *Service) GetAudio(ctx context.Context, cardID, userID uuid.UUID) (string, error) {
	card, err := s.GetByID(ctx, cardID, userID)
	if err != nil {
		return "", err
	}
	if !card.TTSEnabled {
		return "", apperror.New("TTS_DISABLED", 400, "tts disabled for this card")
	}
	if s.tts == nil {
		return "", apperror.New("TTS_UNAVAILABLE", 503, "tts service not configured")
	}
	return s.tts.Synthesize(ctx, card.Front)
}

func (s *Service) SynthesizeText(ctx context.Context, text string) (string, error) {
	if s.tts == nil {
		return "", apperror.New("TTS_UNAVAILABLE", 503, "tts service not configured")
	}
	return s.tts.Synthesize(ctx, text)
}
