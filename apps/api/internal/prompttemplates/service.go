package prompttemplates

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxBodyLength = 10_000

type Service struct {
	q *db.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{q: db.New(pool)}
}

func (s *Service) Create(ctx context.Context, in CreateInput) (PromptTemplate, error) {
	body, err := validateBody(in.Body)
	if err != nil {
		return PromptTemplate{}, err
	}
	row, err := s.q.CreatePromptTemplate(ctx, db.CreatePromptTemplateParams{
		UserID: in.UserID,
		Name:   strings.TrimSpace(in.Name),
		Body:   body,
	})
	if err != nil {
		return PromptTemplate{}, mapDBError(err)
	}
	return mapPromptTemplate(row), nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]PromptTemplate, error) {
	rows, err := s.q.ListPromptTemplatesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]PromptTemplate, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapPromptTemplate(r))
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (PromptTemplate, error) {
	row, err := s.q.GetPromptTemplateByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PromptTemplate{}, apperror.ErrPromptTemplateNotFound
		}
		return PromptTemplate{}, err
	}
	if row.UserID != userID {
		return PromptTemplate{}, apperror.ErrPromptTemplateNotFound
	}
	return mapPromptTemplate(row), nil
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (PromptTemplate, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return PromptTemplate{}, err
	}
	var body *string
	if in.Body != nil {
		validated, err := validateBody(*in.Body)
		if err != nil {
			return PromptTemplate{}, err
		}
		body = &validated
	}
	var name *string
	if in.Name != nil {
		trimmed := strings.TrimSpace(*in.Name)
		if trimmed == "" {
			return PromptTemplate{}, apperror.New(
				"VALIDATION_ERROR",
				422,
				"name is required",
			)
		}
		name = &trimmed
	}
	row, err := s.q.UpdatePromptTemplate(ctx, db.UpdatePromptTemplateParams{
		ID:     id,
		UserID: userID,
		Name:   name,
		Body:   body,
	})
	if err != nil {
		return PromptTemplate{}, mapDBError(err)
	}
	return mapPromptTemplate(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeletePromptTemplate(ctx, db.DeletePromptTemplateParams{ID: id, UserID: userID})
}

func validateBody(body string) (string, error) {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return "", apperror.New("VALIDATION_ERROR", 422, "body is required")
	}
	if len(trimmed) > maxBodyLength {
		return "", apperror.New("VALIDATION_ERROR", 422, "body exceeds max length")
	}
	return trimmed, nil
}

func mapDBError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return apperror.New("VALIDATION_ERROR", 422, "template name already exists")
	}
	return err
}

func mapPromptTemplate(row db.PromptTemplate) PromptTemplate {
	return PromptTemplate{
		ID:        row.ID,
		UserID:    row.UserID,
		Name:      row.Name,
		Body:      row.Body,
		CreatedAt: row.CreatedAt.Format(time.RFC3339),
		UpdatedAt: row.UpdatedAt.Format(time.RFC3339),
	}
}
