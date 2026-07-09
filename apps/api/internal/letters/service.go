package letters

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

// querier narrows *db.Queries to the methods this service needs, so tests
// can substitute a fake instead of hitting a real Postgres.
type querier interface {
	CreateLetter(ctx context.Context, arg db.CreateLetterParams) (db.Letter, error)
	ListLettersByUser(ctx context.Context, userID uuid.UUID) ([]db.Letter, error)
	GetLetterByID(ctx context.Context, id uuid.UUID) (db.Letter, error)
	UpdateLetter(ctx context.Context, arg db.UpdateLetterParams) (db.Letter, error)
	DeleteLetter(ctx context.Context, id uuid.UUID) error
	GetDeckByID(ctx context.Context, id uuid.UUID) (db.Deck, error)
}

type Service struct {
	q querier
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{q: db.New(pool)}
}

type Letter struct {
	ID             uuid.UUID
	UserID         uuid.UUID
	Title          string
	Artist         string
	OriginalLyrics string
	Translation    string
	DeckID         *uuid.UUID
	CreatedAt      string
	UpdatedAt      string
}

type CreateInput struct {
	UserID         uuid.UUID
	Title          string
	Artist         string
	OriginalLyrics string
	Translation    string
	DeckID         *uuid.UUID
}

type UpdateInput struct {
	Title           *string
	Artist          *string
	OriginalLyrics  *string
	Translation     *string
	DeckID          *uuid.UUID
	DeckIDSet       bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Letter, error) {
	if in.DeckID != nil {
		if err := s.validateDeckOwnership(ctx, *in.DeckID, in.UserID); err != nil {
			return Letter{}, err
		}
	}
	row, err := s.q.CreateLetter(ctx, db.CreateLetterParams{
		UserID:         in.UserID,
		Title:          in.Title,
		Artist:         in.Artist,
		OriginalLyrics: in.OriginalLyrics,
		Translation:    in.Translation,
		DeckID:         in.DeckID,
	})
	if err != nil {
		return Letter{}, err
	}
	return mapLetter(row), nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]Letter, error) {
	rows, err := s.q.ListLettersByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Letter, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapLetter(row))
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (Letter, error) {
	row, err := s.q.GetLetterByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Letter{}, apperror.ErrLetterNotFound
		}
		return Letter{}, err
	}
	if row.UserID != userID {
		return Letter{}, apperror.ErrLetterNotFound
	}
	return mapLetter(row), nil
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Letter, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return Letter{}, err
	}
	if in.DeckIDSet && in.DeckID != nil {
		if err := s.validateDeckOwnership(ctx, *in.DeckID, userID); err != nil {
			return Letter{}, err
		}
	}
	deckIDSet := in.DeckIDSet
	row, err := s.q.UpdateLetter(ctx, db.UpdateLetterParams{
		ID:             id,
		Title:          in.Title,
		Artist:         in.Artist,
		OriginalLyrics: in.OriginalLyrics,
		Translation:    in.Translation,
		DeckIDSet:      &deckIDSet,
		DeckID:         in.DeckID,
	})
	if err != nil {
		return Letter{}, err
	}
	return mapLetter(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteLetter(ctx, id)
}

func (s *Service) validateDeckOwnership(ctx context.Context, deckID, userID uuid.UUID) error {
	row, err := s.q.GetDeckByID(ctx, deckID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return apperror.ErrDeckNotFound
		}
		return err
	}
	if row.UserID != userID {
		return apperror.ErrDeckNotFound
	}
	return nil
}

func mapLetter(row db.Letter) Letter {
	return Letter{
		ID:             row.ID,
		UserID:         row.UserID,
		Title:          row.Title,
		Artist:         row.Artist,
		OriginalLyrics: row.OriginalLyrics,
		Translation:    row.Translation,
		DeckID:         row.DeckID,
		CreatedAt:      row.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      row.UpdatedAt.Format(time.RFC3339),
	}
}
