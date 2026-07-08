package notes

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

type Note struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Title     string
	Content   string
	CreatedAt string
	UpdatedAt string
}

type CreateInput struct {
	UserID  uuid.UUID
	Title   string
	Content string
}

type UpdateInput struct {
	Title   *string
	Content *string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Note, error) {
	row, err := s.q.CreateNote(ctx, db.CreateNoteParams{
		UserID:  in.UserID,
		Title:   in.Title,
		Content: in.Content,
	})
	if err != nil {
		return Note{}, err
	}
	return mapNote(row), nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]Note, error) {
	rows, err := s.q.ListNotesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Note, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapNote(r))
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (Note, error) {
	row, err := s.q.GetNoteByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Note{}, apperror.ErrNoteNotFound
		}
		return Note{}, err
	}
	if row.UserID != userID {
		return Note{}, apperror.ErrForbidden
	}
	return mapNote(row), nil
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Note, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return Note{}, err
	}
	row, err := s.q.UpdateNote(ctx, db.UpdateNoteParams{
		ID:      id,
		Title:   in.Title,
		Content: in.Content,
	})
	if err != nil {
		return Note{}, err
	}
	return mapNote(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteNote(ctx, id)
}

func mapNote(row db.Note) Note {
	return Note{
		ID:        row.ID,
		UserID:    row.UserID,
		Title:     row.Title,
		Content:   row.Content,
		CreatedAt: row.CreatedAt.Format(time.RFC3339),
		UpdatedAt: row.UpdatedAt.Format(time.RFC3339),
	}
}
