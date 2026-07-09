package auth

import (
	"context"
	"errors"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type pgRepository struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool, q: db.New(pool)}
}

func (r *pgRepository) CreateUser(ctx context.Context, p CreateUserParams) (User, error) {
	row, err := r.q.CreateUser(ctx, db.CreateUserParams{
		Email:            p.Email,
		Nickname:         p.Nickname,
		Name:             p.Name,
		HashedPassword:   &p.HashedPassword,
		FsrsParameters:   p.FSRSParameters,
		DesiredRetention: p.DesiredRetention,
	})
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, apperror.ErrUserAlreadyExists
		}
		return User{}, err
	}
	return userFromRow(row), nil
}

func (r *pgRepository) GetUserByEmail(ctx context.Context, email string) (User, error) {
	row, err := r.q.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperror.ErrUserNotFound
		}
		return User{}, err
	}
	return userFromRow(row), nil
}

func (r *pgRepository) GetUserByID(ctx context.Context, id uuid.UUID) (User, error) {
	row, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperror.ErrUserNotFound
		}
		return User{}, err
	}
	return userFromRow(row), nil
}

func (r *pgRepository) CreateRefreshToken(ctx context.Context, p CreateRefreshTokenParams) error {
	_, err := r.q.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		UserID:     p.UserID,
		TokenHash:  p.TokenHash,
		ExpiresAt:  p.ExpiresAt,
		DeviceInfo: p.DeviceInfo,
	})
	return err
}

func (r *pgRepository) GetRefreshToken(ctx context.Context, hash string) (RefreshTokenRecord, error) {
	row, err := r.q.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RefreshTokenRecord{}, apperror.ErrInvalidToken
		}
		return RefreshTokenRecord{}, err
	}
	return RefreshTokenRecord{
		UserID:    row.UserID,
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt,
	}, nil
}

func (r *pgRepository) DeleteRefreshToken(ctx context.Context, hash string) error {
	return r.q.DeleteRefreshToken(ctx, hash)
}

func (r *pgRepository) RotateRefreshToken(ctx context.Context, oldHash string, p CreateRefreshTokenParams) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := r.q.WithTx(tx)
	if err := qtx.DeleteRefreshToken(ctx, oldHash); err != nil {
		return err
	}
	if _, err := qtx.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		UserID:     p.UserID,
		TokenHash:  p.TokenHash,
		ExpiresAt:  p.ExpiresAt,
		DeviceInfo: p.DeviceInfo,
	}); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *pgRepository) DeleteAllRefreshTokensForUser(ctx context.Context, userID uuid.UUID) error {
	return r.q.DeleteAllRefreshTokensForUser(ctx, userID)
}

func userFromRow(row db.User) User {
	var hashed string
	if row.HashedPassword != nil {
		hashed = *row.HashedPassword
	}
	var lastOpt *string
	if row.LastOptimization != nil {
		s := row.LastOptimization.Format(timeLayout)
		lastOpt = &s
	}
	return User{
		ID:                 row.ID,
		Email:              row.Email,
		Nickname:           row.Nickname,
		Name:               row.Name,
		HashedPassword:     hashed,
		IsEmailVerified:    row.IsEmailVerified,
		Provider:           row.Provider,
		Providers:          row.Providers,
		FSRSParameters:     row.FsrsParameters,
		DesiredRetention:   row.DesiredRetention,
		OptimizationStatus: row.OptimizationStatus,
		LastOptimization:   lastOpt,
		Timezone:           row.Timezone,
		CreatedAt:          row.CreatedAt.Format(timeLayout),
		UpdatedAt:          row.UpdatedAt.Format(timeLayout),
	}
}

const timeLayout = "2006-01-02T15:04:05Z07:00"

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
