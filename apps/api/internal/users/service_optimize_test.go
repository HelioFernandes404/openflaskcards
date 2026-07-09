package users

import (
	"context"
	"testing"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs/optimize"
	"github.com/google/uuid"
)

func makeReviewRows(n int) []optimize.ReviewRow {
	cardID := uuid.New()
	now := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	rows := make([]optimize.ReviewRow, 0, n)
	for i := 0; i < n; i++ {
		rows = append(rows, optimize.ReviewRow{
			CardID:         cardID,
			Rating:         3,
			ReviewDatetime: now.Add(time.Duration(i) * 24 * time.Hour),
		})
	}
	return rows
}

type fakeOptimizerRunner struct {
	result optimize.Result
	err    error
}

func (f fakeOptimizerRunner) Run(_ context.Context, _ optimize.Input) (optimize.Result, error) {
	if f.err != nil {
		return optimize.Result{}, f.err
	}
	return f.result, nil
}

type fakeReviewLister struct {
	rows []optimize.ReviewRow
	err  error
}

func (f fakeReviewLister) listReviewsForOptimizer(_ context.Context, _ uuid.UUID) ([]optimize.ReviewRow, error) {
	if f.err != nil {
		return nil, f.err
	}
	return f.rows, nil
}

func TestStartOptimizeFSRSCompletesWithFakeRunner(t *testing.T) {
	weights := make([]float64, 21)
	for i := range weights {
		weights[i] = 0.5
	}

	svc := &Service{
		r: newFakeRepo(),
		reviews: fakeReviewLister{
			rows: makeReviewRows(120),
		},
		optimizer: fakeOptimizerRunner{
			result: optimize.Result{
				Weights:          weights,
				OptimalRetention: 0.88,
				TrainItems:       119,
			},
		},
	}
	u := seedUser(svc.r.(*fakeRepo))

	status, err := svc.StartOptimizeFSRS(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("StartOptimizeFSRS: %v", err)
	}
	if status != optimize.StatusRunning {
		t.Fatalf("status: got %q, want running", status)
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		got, err := svc.GetByID(context.Background(), u.ID)
		if err != nil {
			t.Fatalf("GetByID: %v", err)
		}
		if got.OptimizationStatus != nil && *got.OptimizationStatus == optimize.StatusCompleted {
			if got.DesiredRetention != 0.88 {
				t.Fatalf("retention: got %v, want 0.88", got.DesiredRetention)
			}
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatal("optimization did not complete in time")
}

type panicOptimizerRunner struct{}

func (panicOptimizerRunner) Run(_ context.Context, _ optimize.Input) (optimize.Result, error) {
	panic("boom: optimizer sidecar crashed")
}

func TestRunOptimizeRecoversFromPanicAndSetsFailedStatus(t *testing.T) {
	svc := &Service{
		r:         newFakeRepo(),
		reviews:   fakeReviewLister{rows: makeReviewRows(120)},
		optimizer: panicOptimizerRunner{},
	}
	u := seedUser(svc.r.(*fakeRepo))

	// runOptimize must not let the panic escape and crash the process.
	svc.runOptimize(u.ID, u.DesiredRetention)

	got, err := svc.GetByID(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.OptimizationStatus == nil || *got.OptimizationStatus != optimize.StatusFailed {
		t.Fatalf("optimization_status: got %v, want %q", got.OptimizationStatus, optimize.StatusFailed)
	}
}

func TestReconcileStaleOptimizationsResetsOrphanedRunningStatus(t *testing.T) {
	repo := newFakeRepo()
	svc := &Service{r: repo}
	u := seedUser(repo)
	running := optimize.StatusRunning
	u.OptimizationStatus = &running
	repo.users[u.ID] = u

	if err := svc.ReconcileStaleOptimizations(context.Background()); err != nil {
		t.Fatalf("ReconcileStaleOptimizations: %v", err)
	}

	got, err := svc.GetByID(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.OptimizationStatus == nil || *got.OptimizationStatus != optimize.StatusFailed {
		t.Fatalf("expected orphaned 'running' status to reset to 'failed', got %v", got.OptimizationStatus)
	}
}

func TestStartOptimizeFSRSRejectsWhenAlreadyRunning(t *testing.T) {
	running := optimize.StatusRunning
	svc := &Service{
		r: newFakeRepo(),
		reviews: fakeReviewLister{rows: makeReviewRows(120)},
		optimizer: fakeOptimizerRunner{
			result: optimize.Result{Weights: make([]float64, 21), OptimalRetention: 0.9},
		},
	}
	u := seedUser(svc.r.(*fakeRepo))
	u.OptimizationStatus = &running
	svc.r.(*fakeRepo).users[u.ID] = u

	if _, err := svc.StartOptimizeFSRS(context.Background(), u.ID); err == nil {
		t.Fatal("expected conflict when optimization already running")
	}
}

// blockingOptimizerRunner holds the optimization until release is closed,
// simulating a long-running sidecar during shutdown.
type blockingOptimizerRunner struct {
	started chan struct{}
	release chan struct{}
	result  optimize.Result
}

func (b blockingOptimizerRunner) Run(_ context.Context, _ optimize.Input) (optimize.Result, error) {
	close(b.started)
	<-b.release
	return b.result, nil
}

func TestWaitForJobsReturnsAfterRunningOptimizationFinishes(t *testing.T) {
	weights := make([]float64, 21)
	runner := blockingOptimizerRunner{
		started: make(chan struct{}),
		release: make(chan struct{}),
		result:  optimize.Result{Weights: weights, OptimalRetention: 0.9, TrainItems: 119},
	}
	svc := &Service{
		r:         newFakeRepo(),
		reviews:   fakeReviewLister{rows: makeReviewRows(120)},
		optimizer: runner,
	}
	u := seedUser(svc.r.(*fakeRepo))

	if _, err := svc.StartOptimizeFSRS(context.Background(), u.ID); err != nil {
		t.Fatalf("StartOptimizeFSRS: %v", err)
	}
	<-runner.started

	done := make(chan error, 1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		done <- svc.WaitForJobs(ctx)
	}()

	select {
	case err := <-done:
		t.Fatalf("WaitForJobs returned %v while an optimization was still running", err)
	case <-time.After(50 * time.Millisecond):
		// Still waiting, as it should be.
	}

	close(runner.release)
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("WaitForJobs after job completion: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("WaitForJobs did not return after the optimization finished")
	}
}

func TestWaitForJobsHonorsContextDeadlineWithHungJob(t *testing.T) {
	runner := blockingOptimizerRunner{
		started: make(chan struct{}),
		release: make(chan struct{}),
	}
	svc := &Service{
		r:         newFakeRepo(),
		reviews:   fakeReviewLister{rows: makeReviewRows(120)},
		optimizer: runner,
	}
	u := seedUser(svc.r.(*fakeRepo))

	if _, err := svc.StartOptimizeFSRS(context.Background(), u.ID); err != nil {
		t.Fatalf("StartOptimizeFSRS: %v", err)
	}
	<-runner.started
	defer close(runner.release)

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if err := svc.WaitForJobs(ctx); err == nil {
		t.Fatal("expected WaitForJobs to return the context error for a hung job, got nil")
	}
}

func TestWaitForJobsReturnsImmediatelyWithNoJobs(t *testing.T) {
	svc := &Service{r: newFakeRepo()}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := svc.WaitForJobs(ctx); err != nil {
		t.Fatalf("WaitForJobs with no jobs: %v", err)
	}
}
