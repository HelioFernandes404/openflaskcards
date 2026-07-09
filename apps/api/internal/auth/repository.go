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

func (r *pgRepository) DeleteRefreshToken(ctx context.Context, hash string) error {
	return r.q.DeleteRefreshToken(ctx, hash)
}

// RedeemRefreshToken atomically deletes the refresh token identified by hash
// and returns the row that was deleted. The DELETE...RETURNING is a single
// statement, so it is atomic at the row level: if two requests race to
// redeem the same hash, only one of them gets a row back — the other sees
// pgx.ErrNoRows (mapped to apperror.ErrInvalidToken) because the row is
// already gone. This closes the read-then-delete race that let a single
// refresh token be used concurrently to mint two valid token pairs.
func (r *pgRepository) RedeemRefreshToken(ctx context.Context, hash string) (RefreshTokenRecord, error) {
	row, err := r.q.DeleteRefreshTokenReturning(ctx, hash)
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

func (r *pgRepository) DeleteAllRefreshTokensForUser(ctx context.Context, userID uuid.UUID) error {
	return r.q.DeleteAllRefreshTokensForUser(ctx, userID)
}

func (r *pgRepository) CreatePasswordResetToken(ctx context.Context, p CreatePasswordResetTokenParams) error {
	_, err := r.q.CreatePasswordResetToken(ctx, db.CreatePasswordResetTokenParams{
		UserID:    p.UserID,
		TokenHash: p.TokenHash,
		ExpiresAt: p.ExpiresAt,
	})
	return err
}

func (r *pgRepository) GetPasswordResetTokenByHash(ctx context.Context, hash string) (PasswordResetTokenRecord, error) {
	row, err := r.q.GetPasswordResetTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return PasswordResetTokenRecord{}, apperror.ErrInvalidToken
		}
		return PasswordResetTokenRecord{}, err
	}
	return PasswordResetTokenRecord{
		ID:        row.ID,
		UserID:    row.UserID,
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt,
		UsedAt:    row.UsedAt,
	}, nil
}

func (r *pgRepository) MarkPasswordResetTokenUsed(ctx context.Context, id uuid.UUID) error {
	return r.q.MarkPasswordResetTokenUsed(ctx, id)
}

func (r *pgRepository) UpdateUserPassword(ctx context.Context, userID uuid.UUID, hashedPassword string) error {
	return r.q.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{
		ID:             userID,
		HashedPassword: &hashedPassword,
	})
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
