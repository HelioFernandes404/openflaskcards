// Package users implements the users feature (GET/PATCH /me).
package users

import (
	"context"
	"errors"
	"sync"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs/optimize"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type repo interface {
	getByID(ctx context.Context, id uuid.UUID) (db.User, error)
	update(ctx context.Context, arg db.UpdateUserParams) (db.User, error)
	updateFSRS(ctx context.Context, arg db.UpdateUserFSRSParams) (db.User, error)
	updateOptimizationStatus(ctx context.Context, arg db.UpdateUserOptimizationStatusParams) (db.User, error)
	updateFSRSAfterOptimization(ctx context.Context, arg db.UpdateUserFSRSAfterOptimizationParams) (db.User, error)
	resetStaleRunningOptimizations(ctx context.Context) error
	// claimOptimizationRun atomically flips optimization_status to "running"
	// iff it isn't already "running", returning pgx.ErrNoRows when someone
	// else already holds the claim. This is the source of truth for
	// concurrency control — the in-memory map is only a local optimization.
	claimOptimizationRun(ctx context.Context, id uuid.UUID) (uuid.UUID, error)
}

type pgRepo struct{ q *db.Queries }

func (r *pgRepo) getByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.q.GetUserByID(ctx, id)
}
func (r *pgRepo) update(ctx context.Context, arg db.UpdateUserParams) (db.User, error) {
	return r.q.UpdateUser(ctx, arg)
}
func (r *pgRepo) updateFSRS(ctx context.Context, arg db.UpdateUserFSRSParams) (db.User, error) {
	return r.q.UpdateUserFSRS(ctx, arg)
}
func (r *pgRepo) updateOptimizationStatus(ctx context.Context, arg db.UpdateUserOptimizationStatusParams) (db.User, error) {
	return r.q.UpdateUserOptimizationStatus(ctx, arg)
}
func (r *pgRepo) updateFSRSAfterOptimization(ctx context.Context, arg db.UpdateUserFSRSAfterOptimizationParams) (db.User, error) {
	return r.q.UpdateUserFSRSAfterOptimization(ctx, arg)
}
func (r *pgRepo) resetStaleRunningOptimizations(ctx context.Context) error {
	return r.q.ResetStaleRunningOptimizations(ctx)
}
func (r *pgRepo) claimOptimizationRun(ctx context.Context, id uuid.UUID) (uuid.UUID, error) {
	return r.q.ClaimOptimizationRun(ctx, id)
}

type Service struct {
	r         repo
	reviews   reviewLister
	optimizer optimizerRunner

	mu      sync.Mutex
	running map[uuid.UUID]bool
	jobs    sync.WaitGroup
}

// WaitForJobs blocks until all in-flight background optimizations finish or
// ctx expires, so shutdown can drain them before closing the DB pool.
func (s *Service) WaitForJobs(ctx context.Context) error {
	done := make(chan struct{})
	go func() {
		s.jobs.Wait()
		close(done)
	}()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func NewService(pool *pgxpool.Pool, opts ...ServiceOption) *Service {
	q := db.New(pool)
	s := &Service{
		r:         &pgRepo{q: q},
		reviews:   pgReviewLister{q: q},
		optimizer: optimize.NewRunnerFromEnv(),
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

type User struct {
	ID                 uuid.UUID
	Email              string
	Nickname           string
	Name               *string
	IsEmailVerified    bool
	Provider           *string
	Providers          []string
	FSRSParameters     []float64
	DesiredRetention   float64
	OptimizationStatus *string
	LastOptimization   *string
	Timezone           *string
	CreatedAt          string
	UpdatedAt          string
}

type UpdateInput struct {
	Email    *string
	Nickname *string
	Name     *string
	Password *string
	// CurrentPassword is the plaintext current password, required to change
	// Password on accounts that already have a local password.
	CurrentPassword *string
	Timezone        *string
	// TimezoneSet distinguishes "timezone omitted" (keep current value) from
	// "timezone explicitly sent" (including null, to clear back to default).
	TimezoneSet bool
}

type UpdateFSRSInput struct {
	Weights          []float64
	DesiredRetention *float64
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (User, error) {
	row, err := s.r.getByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperror.ErrUserNotFound
		}
		return User{}, err
	}
	return mapUser(row), nil
}

func (s *Service) UpdateFSRS(ctx context.Context, id uuid.UUID, in UpdateFSRSInput) (User, error) {
	// in.Weights is nil when the field was omitted (COALESCE keeps the
	// existing value) vs a non-nil empty slice when the client sent
	// `"weights": []` — that must be rejected, not silently wipe the
	// user's optimized parameters back to an empty array.
	if in.Weights != nil && len(in.Weights) != 21 {
		return User{}, apperror.New("VALIDATION_ERROR", 422, "weights must have exactly 21 values")
	}
	if in.DesiredRetention != nil && (*in.DesiredRetention <= 0 || *in.DesiredRetention > 1) {
		return User{}, apperror.New("VALIDATION_ERROR", 422, "desired_retention must be in (0, 1]")
	}
	row, err := s.r.updateFSRS(ctx, db.UpdateUserFSRSParams{
		ID:               id,
		FsrsParameters:   in.Weights,
		DesiredRetention: in.DesiredRetention,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperror.ErrUserNotFound
		}
		return User{}, err
	}
	return mapUser(row), nil
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, in UpdateInput) (User, error) {
	// Note: password hashing handled by caller via auth package if Password set
	if in.Password != nil {
		current, err := s.r.getByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return User{}, apperror.ErrUserNotFound
			}
			return User{}, err
		}
		// Accounts with a local password must confirm it before changing it,
		// so a stolen access token alone can't lock the owner out. Accounts
		// without one (OAuth) are setting their first password.
		if current.HashedPassword != nil && *current.HashedPassword != "" {
			if in.CurrentPassword == nil ||
				!auth.VerifyPassword(*current.HashedPassword, *in.CurrentPassword) {
				return User{}, apperror.ErrInvalidCredentials
			}
		}
	}
	row, err := s.r.update(ctx, db.UpdateUserParams{
		ID:             id,
		Email:          in.Email,
		Nickname:       in.Nickname,
		Name:           in.Name,
		HashedPassword: in.Password,
		Timezone:       in.Timezone,
		TimezoneSet:    &in.TimezoneSet,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperror.ErrUserNotFound
		}
		return User{}, err
	}
	return mapUser(row), nil
}

func mapUser(row db.User) User {
	var lastOpt *string
	if row.LastOptimization != nil {
		s := row.LastOptimization.Format("2006-01-02T15:04:05Z07:00")
		lastOpt = &s
	}
	return User{
		ID:                 row.ID,
		Email:              row.Email,
		Nickname:           row.Nickname,
		Name:               row.Name,
		IsEmailVerified:    row.IsEmailVerified,
		Provider:           row.Provider,
		Providers:          row.Providers,
		FSRSParameters:     row.FsrsParameters,
		DesiredRetention:   row.DesiredRetention,
		OptimizationStatus: row.OptimizationStatus,
		LastOptimization:   lastOpt,
		Timezone:           row.Timezone,
		CreatedAt:          row.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:          row.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
