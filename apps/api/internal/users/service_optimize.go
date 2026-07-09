package users

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs/optimize"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type reviewLister interface {
	listReviewsForOptimizer(ctx context.Context, userID uuid.UUID) ([]optimize.ReviewRow, error)
}

type optimizerRunner interface {
	Run(ctx context.Context, input optimize.Input) (optimize.Result, error)
}

// ServiceOption configures optional users service dependencies.
type ServiceOption func(*Service)

// WithOptimizerRunner injects the FSRS optimizer sidecar runner.
func WithOptimizerRunner(runner optimizerRunner) ServiceOption {
	return func(s *Service) {
		s.optimizer = runner
	}
}

// WithReviewLister injects a custom review lister (tests).
func WithReviewLister(lister reviewLister) ServiceOption {
	return func(s *Service) {
		s.reviews = lister
	}
}

type pgReviewLister struct {
	q *db.Queries
}

func (p pgReviewLister) listReviewsForOptimizer(ctx context.Context, userID uuid.UUID) ([]optimize.ReviewRow, error) {
	rows, err := p.q.ListReviewsByUserForOptimizer(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]optimize.ReviewRow, 0, len(rows))
	for _, row := range rows {
		out = append(out, optimize.ReviewRow{
			CardID:         row.CardID,
			Rating:         row.Rating,
			ReviewDatetime: row.ReviewDatetime,
		})
	}
	return out, nil
}

func (s *Service) markRunning(userID uuid.UUID) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running == nil {
		s.running = make(map[uuid.UUID]bool)
	}
	if s.running[userID] {
		return false
	}
	s.running[userID] = true
	return true
}

func (s *Service) clearRunning(userID uuid.UUID) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.running, userID)
}

// StartOptimizeFSRS kicks off async FSRS parameter optimization for a user.
func (s *Service) StartOptimizeFSRS(ctx context.Context, userID uuid.UUID) (string, error) {
	u, err := s.r.getByID(ctx, userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", apperror.ErrUserNotFound
		}
		return "", err
	}
	if u.OptimizationStatus != nil && *u.OptimizationStatus == optimize.StatusRunning {
		return "", apperror.New("OPTIMIZATION_RUNNING", http.StatusConflict, "optimization already running")
	}
	if !s.markRunning(userID) {
		return "", apperror.New("OPTIMIZATION_RUNNING", http.StatusConflict, "optimization already running")
	}

	status := optimize.StatusRunning
	if _, err := s.r.updateOptimizationStatus(ctx, db.UpdateUserOptimizationStatusParams{
		ID:                 userID,
		OptimizationStatus: &status,
	}); err != nil {
		s.clearRunning(userID)
		return "", err
	}

	desiredRetention := u.DesiredRetention
	s.jobs.Add(1)
	go func() {
		defer s.jobs.Done()
		s.runOptimize(userID, desiredRetention)
	}()
	return optimize.StatusRunning, nil
}

// ReconcileStaleOptimizations resets any user left in "running" from a
// crash/restart mid-optimization — the in-memory `running` guard is lost
// on restart, so those rows would otherwise return 409 forever. Call once
// at startup before serving traffic.
func (s *Service) ReconcileStaleOptimizations(ctx context.Context) error {
	return s.r.resetStaleRunningOptimizations(ctx)
}

func (s *Service) runOptimize(userID uuid.UUID, currentRetention float64) {
	defer s.clearRunning(userID)
	ctx := context.Background()
	defer func() {
		if r := recover(); r != nil {
			s.setOptimizationStatus(ctx, userID, optimize.StatusFailed)
		}
	}()

	rows, err := s.reviews.listReviewsForOptimizer(ctx, userID)
	if err != nil {
		s.setOptimizationStatus(ctx, userID, optimize.StatusFailed)
		return
	}
	if err := optimize.ValidateRows(rows); err != nil {
		s.setOptimizationStatus(ctx, userID, optimize.StatusInsufficientData)
		return
	}

	input := optimize.BuildInput(rows, currentRetention)
	result, err := s.optimizer.Run(ctx, input)
	if err != nil {
		status := optimize.StatusFailed
		if optimize.IsInsufficientData(err) {
			status = optimize.StatusInsufficientData
		}
		s.setOptimizationStatus(ctx, userID, status)
		return
	}

	if _, err := s.r.updateFSRSAfterOptimization(ctx, db.UpdateUserFSRSAfterOptimizationParams{
		ID:               userID,
		FsrsParameters:   result.Weights,
		DesiredRetention: result.OptimalRetention,
	}); err != nil {
		s.setOptimizationStatus(ctx, userID, optimize.StatusFailed)
	}
}

func (s *Service) setOptimizationStatus(ctx context.Context, userID uuid.UUID, status string) {
	if _, err := s.r.updateOptimizationStatus(ctx, db.UpdateUserOptimizationStatusParams{
		ID:                 userID,
		OptimizationStatus: &status,
	}); err != nil {
		return
	}
}
