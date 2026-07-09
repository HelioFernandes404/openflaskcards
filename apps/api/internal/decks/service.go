// apps/api/internal/decks/service.go
package decks

import (
	"context"
	"errors"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q *db.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{q: db.New(pool)}
}

type Deck struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	ModuleID           *uuid.UUID
	Name               string
	Description        *string
	Tags               []string
	NewCardsDailyLimit int32
	CreatedAt          string
	UpdatedAt          string
}

type CreateInput struct {
	UserID             uuid.UUID
	ModuleID           *uuid.UUID
	Name               string
	Description        *string
	Tags               []string
	NewCardsDailyLimit int32
}

type UpdateInput struct {
	Name               *string
	Description        *string
	Tags               []string
	NewCardsDailyLimit *int32
	ModuleID           *uuid.UUID
	ModuleIDSet        bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Deck, error) {
	if in.ModuleID != nil {
		if err := s.validateModuleOwnership(ctx, *in.ModuleID, in.UserID); err != nil {
			return Deck{}, err
		}
	}
	row, err := s.q.CreateDeck(ctx, db.CreateDeckParams{
		UserID:             in.UserID,
		Name:               in.Name,
		Description:        in.Description,
		Tags:               in.Tags,
		NewCardsDailyLimit: in.NewCardsDailyLimit,
		ModuleID:           in.ModuleID,
	})
	if err != nil {
		return Deck{}, err
	}
	return mapDeck(row), nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]Deck, error) {
	rows, err := s.q.ListDecksByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Deck, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapDeck(r))
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (Deck, error) {
	row, err := s.q.GetDeckByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Deck{}, apperror.ErrDeckNotFound
		}
		return Deck{}, err
	}
	if row.UserID != userID {
		return Deck{}, apperror.ErrDeckNotFound
	}
	return mapDeck(row), nil
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Deck, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return Deck{}, err
	}
	if in.ModuleIDSet && in.ModuleID != nil {
		if err := s.validateModuleOwnership(ctx, *in.ModuleID, userID); err != nil {
			return Deck{}, err
		}
	}
	row, err := s.q.UpdateDeck(ctx, db.UpdateDeckParams{
		ID:                 id,
		UserID:             userID,
		Name:               in.Name,
		Description:        in.Description,
		Tags:               in.Tags,
		NewCardsDailyLimit: in.NewCardsDailyLimit,
		ModuleID:           in.ModuleID,
		ModuleIDSet:        &in.ModuleIDSet,
	})
	if err != nil {
		return Deck{}, err
	}
	return mapDeck(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteDeck(ctx, db.DeleteDeckParams{ID: id, UserID: userID})
}

type DeckStats struct {
	DeckID               uuid.UUID
	NewCount             int64
	LearningCount        int64
	ReviewCount          int64
	TotalCards           int64
	NewCardsStudiedToday int64
	NewCardsDailyLimit   int32
}

func (s *Service) StatsByUser(ctx context.Context, userID uuid.UUID) ([]DeckStats, error) {
	now := time.Now().UTC()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	rows, err := s.q.DeckStatsByUser(ctx, db.DeckStatsByUserParams{
		UserID: userID, Due: now, StartOfDay: startOfDay,
	})
	if err != nil {
		return nil, err
	}
	out := make([]DeckStats, 0, len(rows))
	for _, r := range rows {
		out = append(out, DeckStats{
			DeckID:               r.DeckID,
			NewCount:             r.NewCount,
			LearningCount:        r.LearningCount,
			ReviewCount:          r.ReviewCount,
			TotalCards:           r.TotalCards,
			NewCardsStudiedToday: r.NewCardsStudiedToday,
			NewCardsDailyLimit:   r.NewCardsDailyLimit,
		})
	}
	return out, nil
}

func mapDeck(row db.Deck) Deck {
	return Deck{
		ID:                 row.ID,
		UserID:             row.UserID,
		ModuleID:           row.ModuleID,
		Name:               row.Name,
		Description:        row.Description,
		Tags:               row.Tags,
		NewCardsDailyLimit: row.NewCardsDailyLimit,
		CreatedAt:          row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:          row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func (s *Service) validateModuleOwnership(ctx context.Context, moduleID, userID uuid.UUID) error {
	row, err := s.q.GetModuleByID(ctx, moduleID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.ErrModuleNotFound
		}
		return err
	}
	if row.UserID != userID {
		return apperror.ErrModuleNotFound
	}
	return nil
}
