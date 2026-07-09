package kanban

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
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool, q: db.New(pool)}
}

type KanbanCard struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	Title            string
	Description      string
	Status           string
	Priority         string
	Assignee         *string
	Position         int32
	Type             string
	VerificationNote string
	CreatedAt        string
	UpdatedAt        string
}

type CreateInput struct {
	UserID      uuid.UUID
	Title       string
	Description string
	Status      string
	Priority    string
	Assignee    *string
	Type        string
}

type UpdateInput struct {
	Title            *string
	Description      *string
	Status           *string
	Priority         *string
	Assignee         *string
	Type             *string
	VerificationNote *string
}

func (s *Service) Create(ctx context.Context, in CreateInput) (KanbanCard, error) {
	status := in.Status
	if status == "" {
		status = "backlog"
	}
	priority := in.Priority
	if priority == "" {
		priority = "medium"
	}
	cardType := in.Type
	if cardType == "" {
		cardType = "feature"
	}
	maxPos, err := s.q.MaxPositionForStatus(ctx, db.MaxPositionForStatusParams{UserID: in.UserID, Status: status})
	if err != nil {
		return KanbanCard{}, err
	}
	row, err := s.q.CreateKanbanCard(ctx, db.CreateKanbanCardParams{
		UserID:      in.UserID,
		Title:       in.Title,
		Description: in.Description,
		Status:      status,
		Priority:    priority,
		Assignee:    in.Assignee,
		Position:    maxPos + 1,
		Type:        cardType,
	})
	if err != nil {
		return KanbanCard{}, err
	}
	return mapKanbanCard(row), nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID, status *string) ([]KanbanCard, error) {
	var rows []db.KanbanCard
	var err error
	if status != nil && *status != "" {
		rows, err = s.q.ListKanbanCardsByUserAndStatus(ctx, db.ListKanbanCardsByUserAndStatusParams{UserID: userID, Status: *status})
	} else {
		rows, err = s.q.ListKanbanCardsByUser(ctx, userID)
	}
	if err != nil {
		return nil, err
	}
	out := make([]KanbanCard, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapKanbanCard(r))
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (KanbanCard, error) {
	row, err := s.q.GetKanbanCardByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return KanbanCard{}, apperror.ErrKanbanCardNotFound
		}
		return KanbanCard{}, err
	}
	if row.UserID != userID {
		return KanbanCard{}, apperror.ErrKanbanCardNotFound
	}
	return mapKanbanCard(row), nil
}

// Update applies partial changes. When Status changes, the card is appended to
// the bottom of the destination column (its position is recomputed) inside a
// transaction so concurrent moves never collide on position.
func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (KanbanCard, error) {
	current, err := s.GetByID(ctx, id, userID)
	if err != nil {
		return KanbanCard{}, err
	}

	params := db.UpdateKanbanCardParams{
		ID:               id,
		Title:            in.Title,
		Description:      in.Description,
		Status:           in.Status,
		Priority:         in.Priority,
		Assignee:         in.Assignee,
		Type:             in.Type,
		VerificationNote: in.VerificationNote,
	}

	if in.Status == nil || *in.Status == current.Status {
		row, err := s.q.UpdateKanbanCard(ctx, params)
		if err != nil {
			return KanbanCard{}, err
		}
		return mapKanbanCard(row), nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return KanbanCard{}, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	maxPos, err := qtx.MaxPositionForStatus(ctx, db.MaxPositionForStatusParams{UserID: userID, Status: *in.Status})
	if err != nil {
		return KanbanCard{}, err
	}
	newPos := maxPos + 1
	params.Position = &newPos

	row, err := qtx.UpdateKanbanCard(ctx, params)
	if err != nil {
		return KanbanCard{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return KanbanCard{}, err
	}
	return mapKanbanCard(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteKanbanCard(ctx, id)
}

// PullNext atomically grabs the earliest "todo" card for userID, moves it to
// "in_progress", assigns it, and appends it to the bottom of the In Progress
// column. FOR UPDATE SKIP LOCKED on the underlying query means a human and a
// Claude Code loop pulling at the same moment never grab the same card.
func (s *Service) PullNext(ctx context.Context, userID uuid.UUID, assignee string) (KanbanCard, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return KanbanCard{}, err
	}
	defer tx.Rollback(ctx)
	qtx := s.q.WithTx(tx)

	next, err := qtx.NextTodoCardForUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return KanbanCard{}, apperror.ErrNoTodoCards
		}
		return KanbanCard{}, err
	}

	maxPos, err := qtx.MaxPositionForStatus(ctx, db.MaxPositionForStatusParams{UserID: userID, Status: "in_progress"})
	if err != nil {
		return KanbanCard{}, err
	}
	newPos := maxPos + 1
	newStatus := "in_progress"
	row, err := qtx.UpdateKanbanCard(ctx, db.UpdateKanbanCardParams{
		ID:       next.ID,
		Status:   &newStatus,
		Assignee: &assignee,
		Position: &newPos,
	})
	if err != nil {
		return KanbanCard{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return KanbanCard{}, err
	}
	return mapKanbanCard(row), nil
}

func mapKanbanCard(row db.KanbanCard) KanbanCard {
	return KanbanCard{
		ID:               row.ID,
		UserID:           row.UserID,
		Title:            row.Title,
		Description:      row.Description,
		Status:           row.Status,
		Priority:         row.Priority,
		Assignee:         row.Assignee,
		Position:         row.Position,
		Type:             row.Type,
		VerificationNote: row.VerificationNote,
		CreatedAt:        row.CreatedAt.Format(time.RFC3339),
		UpdatedAt:        row.UpdatedAt.Format(time.RFC3339),
	}
}
