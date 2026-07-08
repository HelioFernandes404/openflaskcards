package media

import (
	"context"
	"errors"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgRepository struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

// NewRepository builds a Postgres-backed media repository.
func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool, q: db.New(pool)}
}

func (r *pgRepository) CreateMedia(ctx context.Context, p CreateMediaParams) (Media, error) {
	row, err := r.q.CreateMedia(ctx, db.CreateMediaParams{
		ID:               p.ID,
		UserID:           p.UserID,
		Kind:             p.Kind,
		StoragePath:      p.StoragePath,
		OriginalFilename: p.OriginalFilename,
		ContentType:      p.ContentType,
		SizeBytes:        p.SizeBytes,
	})
	if err != nil {
		return Media{}, err
	}
	return mapMedia(row), nil
}

func (r *pgRepository) GetMediaByID(ctx context.Context, id uuid.UUID) (Media, error) {
	row, err := r.q.GetMediaByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Media{}, apperror.ErrMediaNotFound
		}
		return Media{}, err
	}
	return mapMedia(row), nil
}

func (r *pgRepository) DeleteMedia(ctx context.Context, id, userID uuid.UUID) error {
	return r.q.DeleteMedia(ctx, db.DeleteMediaParams{ID: id, UserID: userID})
}

func (r *pgRepository) CountCardsReferencingURL(ctx context.Context, url string) (int64, error) {
	return r.q.CountCardsReferencingMediaURL(ctx, &url)
}

func mapMedia(row db.Medium) Media {
	return Media{
		ID:               row.ID,
		UserID:           row.UserID,
		Kind:             row.Kind,
		StoragePath:      row.StoragePath,
		OriginalFilename: row.OriginalFilename,
		ContentType:      row.ContentType,
		SizeBytes:        row.SizeBytes,
		CreatedAt:        row.CreatedAt,
	}
}
