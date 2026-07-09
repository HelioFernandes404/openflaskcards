package modules

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

type Module struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	Name               string
	Description        *string
	SortOrder          int32
	PromptModuleTypeID string
	CreatedAt          string
	UpdatedAt          string
}

type CreateInput struct {
	UserID             uuid.UUID
	Name               string
	Description        *string
	SortOrder          int32
	PromptModuleTypeID *string
}

type UpdateInput struct {
	Name               *string
	Description        *string
	SortOrder          *int32
	PromptModuleTypeID *string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Module, error) {
	promptTypeID, err := normalizePromptModuleTypeID(in.PromptModuleTypeID)
	if err != nil {
		return Module{}, err
	}
	row, err := s.q.CreateModule(ctx, db.CreateModuleParams{
		UserID:             in.UserID,
		Name:               in.Name,
		Description:        in.Description,
		SortOrder:          in.SortOrder,
		PromptModuleTypeID: promptTypeID,
	})
	if err != nil {
		return Module{}, err
	}
	return mapModule(row), nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]Module, error) {
	rows, err := s.q.ListModulesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Module, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapModule(r))
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (Module, error) {
	row, err := s.q.GetModuleByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Module{}, apperror.ErrModuleNotFound
		}
		return Module{}, err
	}
	if row.UserID != userID {
		return Module{}, apperror.ErrModuleNotFound
	}
	return mapModule(row), nil
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Module, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return Module{}, err
	}
	var promptTypeID *string
	if in.PromptModuleTypeID != nil {
		normalized, err := normalizePromptModuleTypeID(in.PromptModuleTypeID)
		if err != nil {
			return Module{}, err
		}
		promptTypeID = &normalized
	}
	row, err := s.q.UpdateModule(ctx, db.UpdateModuleParams{
		ID:                 id,
		UserID:             userID,
		Name:               in.Name,
		Description:        in.Description,
		SortOrder:          in.SortOrder,
		PromptModuleTypeID: promptTypeID,
	})
	if err != nil {
		return Module{}, err
	}
	return mapModule(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteModule(ctx, db.DeleteModuleParams{ID: id, UserID: userID})
}

func mapModule(row db.Module) Module {
	return Module{
		ID:                 row.ID,
		UserID:             row.UserID,
		Name:               row.Name,
		Description:        row.Description,
		SortOrder:          row.SortOrder,
		PromptModuleTypeID: row.PromptModuleTypeID,
		CreatedAt:          row.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          row.UpdatedAt.Format(time.RFC3339),
	}
}
