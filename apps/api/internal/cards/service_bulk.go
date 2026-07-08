package cards

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type BulkItemInput struct {
	Front      string
	Back       string
	Fonetica   *string
	TTSEnabled *bool
}

type BulkOptions struct {
	SkipInvalidRows bool
	TrimWhitespace  bool
}

type BulkCreateInput struct {
	DeckID  uuid.UUID
	UserID  uuid.UUID
	Items   []BulkItemInput
	Options BulkOptions
}

type BulkItemError struct {
	Index   int
	Message string
}

type BulkCreateOutput struct {
	Created int
	Errors  []BulkItemError
}

// bulkQuerier narrows *db.Queries to what bulkCreateCards needs, so the
// row-by-row validation/trim/skip logic can be unit tested without a real
// Postgres transaction.
type bulkQuerier interface {
	GetDeckByID(ctx context.Context, id uuid.UUID) (db.Deck, error)
	CreateCard(ctx context.Context, arg db.CreateCardParams) (db.Card, error)
}

// bulkCreateCards validates deck ownership once, then creates each item.
// Returning an error here means the caller's transaction is rolled back —
// so an aborted batch (no SkipInvalidRows, or every row invalid) never
// leaves a partial write behind.
func bulkCreateCards(ctx context.Context, q bulkQuerier, scheduler *fsrs.Scheduler, in BulkCreateInput) (BulkCreateOutput, error) {
	deck, err := q.GetDeckByID(ctx, in.DeckID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return BulkCreateOutput{}, apperror.ErrDeckNotFound
		}
		return BulkCreateOutput{}, err
	}
	if deck.UserID != in.UserID {
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
			msg := "front and back must not be empty"
			if in.Options.SkipInvalidRows {
				errs = append(errs, BulkItemError{Index: idx, Message: msg})
				continue
			}
			return BulkCreateOutput{}, apperror.New("VALIDATION_ERROR", 422, fmt.Sprintf("row %d: %s", idx, msg))
		}

		ttsEnabled := true
		if item.TTSEnabled != nil {
			ttsEnabled = *item.TTSEnabled
		}
		newCard := scheduler.NewCard()
		cardJSON, err := scheduler.MarshalCard(newCard)
		if err != nil {
			return BulkCreateOutput{}, err
		}
		js := string(cardJSON)
		if _, err := q.CreateCard(ctx, db.CreateCardParams{
			DeckID: in.DeckID, Front: front, Back: back,
			Fonetica: item.Fonetica, TtsEnabled: ttsEnabled,
			State: "new", Stability: newCard.Stability, Difficulty: newCard.Difficulty,
			Due: newCard.Due, FsrsCardJson: &js,
		}); err != nil {
			return BulkCreateOutput{}, err
		}
		created++
	}

	if created == 0 && len(errs) > 0 {
		return BulkCreateOutput{}, apperror.New("VALIDATION_ERROR", 422, "no cards were created, all rows failed validation")
	}
	return BulkCreateOutput{Created: created, Errors: errs}, nil
}

// BulkCreate wraps bulkCreateCards in a single transaction, so a mid-batch
// failure never leaves a partial write behind.
func (s *Service) BulkCreate(ctx context.Context, in BulkCreateInput) (BulkCreateOutput, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return BulkCreateOutput{}, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	out, err := bulkCreateCards(ctx, qtx, s.fsrs, in)
	if err != nil {
		return BulkCreateOutput{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return BulkCreateOutput{}, err
	}
	return out, nil
}
