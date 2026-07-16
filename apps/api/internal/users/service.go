// Package users implements the users feature (GET/PATCH /me).
package users

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs/optimize"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// defaultUserFSRSWeights are the initial FSRS scheduler parameters seeded
// for the single default user (previously the app-wide default used at
// registration time, back when registration existed).
var defaultUserFSRSWeights = []float64{
	0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046,
	1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315,
	2.9898, 0.51655, 0.6621, 0.0, 0.0,
}

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
	pool      *pgxpool.Pool
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
		pool:      pool,
		r:         &pgRepo{q: q},
		reviews:   pgReviewLister{q: q},
		optimizer: optimize.NewRunnerFromEnv(),
	}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

// EnsureDefaultUser idempotently seeds the single default user row this
// single-user deployment operates as. It is safe to call on every startup:
// ON CONFLICT DO NOTHING makes it a no-op once the row exists.
func (s *Service) EnsureDefaultUser(ctx context.Context, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, email, nickname, name, fsrs_parameters, desired_retention)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT DO NOTHING
	`, id, "owner@localhost", "owner", "Owner", defaultUserFSRSWeights, 0.9)
	if err != nil {
		return err
	}

	var exists bool
	err = s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, id).Scan(&exists)
	if err != nil {
		return err
	}

	if !exists {
		return fmt.Errorf("users: default user %s missing and could not be seeded — database appears to contain legacy multi-user data (conflicting email/nickname); migrate or clear it manually", id)
	}

	return nil
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
	Timezone *string
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
	var resetEmailVerified bool
	// Pointing the account at a different address invalidates the prior
	// verification: nothing confirms the user actually owns the new one.
	if in.Email != nil {
		current, err := s.r.getByID(ctx, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return User{}, apperror.ErrUserNotFound
			}
			return User{}, err
		}
		resetEmailVerified = *in.Email != current.Email
	}
	row, err := s.r.update(ctx, db.UpdateUserParams{
		ID:                 id,
		Email:              in.Email,
		Nickname:           in.Nickname,
		Name:               in.Name,
		Timezone:           in.Timezone,
		TimezoneSet:        &in.TimezoneSet,
		ResetEmailVerified: &resetEmailVerified,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, apperror.ErrUserNotFound
		}
		return User{}, mapUpdateError(err)
	}
	return mapUser(row), nil
}

// mapUpdateError maps a unique-constraint violation on email/nickname to a
// 409 conflict instead of falling through to a generic 500, mirroring the
// pattern in internal/prompttemplates/service.go.
func mapUpdateError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		return err
	}
	switch pgErr.ConstraintName {
	case "ix_users_email":
		return apperror.ErrEmailAlreadyInUse
	case "ix_users_nickname":
		return apperror.ErrNicknameAlreadyInUse
	default:
		return apperror.ErrEmailAlreadyInUse
	}
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
