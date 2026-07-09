package users

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// fakeRepo simulates the users table. It is safe for concurrent use because
// the optimize flow reads/writes it from a background goroutine while tests
// poll it from the test goroutine.
type fakeRepo struct {
	mu        sync.Mutex
	users     map[uuid.UUID]db.User
	updateErr error
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{users: make(map[uuid.UUID]db.User)}
}

func (f *fakeRepo) getByID(_ context.Context, id uuid.UUID) (db.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[id]
	if !ok {
		return db.User{}, pgx.ErrNoRows
	}
	return u, nil
}

func (f *fakeRepo) update(_ context.Context, arg db.UpdateUserParams) (db.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.updateErr != nil {
		return db.User{}, f.updateErr
	}
	u, ok := f.users[arg.ID]
	if !ok {
		return db.User{}, pgx.ErrNoRows
	}
	if arg.Email != nil {
		u.Email = *arg.Email
	}
	if arg.Nickname != nil {
		u.Nickname = *arg.Nickname
	}
	if arg.Name != nil {
		u.Name = arg.Name
	}
	if arg.HashedPassword != nil {
		u.HashedPassword = arg.HashedPassword
	}
	if arg.TimezoneSet != nil && *arg.TimezoneSet {
		u.Timezone = arg.Timezone
	}
	if arg.ResetEmailVerified != nil && *arg.ResetEmailVerified {
		u.IsEmailVerified = false
	}
	f.users[arg.ID] = u
	return u, nil
}

func (f *fakeRepo) updateFSRS(_ context.Context, arg db.UpdateUserFSRSParams) (db.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[arg.ID]
	if !ok {
		return db.User{}, pgx.ErrNoRows
	}
	if arg.FsrsParameters != nil {
		u.FsrsParameters = arg.FsrsParameters
	}
	if arg.DesiredRetention != nil {
		u.DesiredRetention = *arg.DesiredRetention
	}
	f.users[arg.ID] = u
	return u, nil
}

func (f *fakeRepo) updateOptimizationStatus(_ context.Context, arg db.UpdateUserOptimizationStatusParams) (db.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[arg.ID]
	if !ok {
		return db.User{}, pgx.ErrNoRows
	}
	u.OptimizationStatus = arg.OptimizationStatus
	f.users[arg.ID] = u
	return u, nil
}

func (f *fakeRepo) claimOptimizationRun(_ context.Context, id uuid.UUID) (uuid.UUID, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[id]
	if !ok {
		return uuid.UUID{}, pgx.ErrNoRows
	}
	if u.OptimizationStatus != nil && *u.OptimizationStatus == "running" {
		return uuid.UUID{}, pgx.ErrNoRows
	}
	running := "running"
	u.OptimizationStatus = &running
	f.users[id] = u
	return id, nil
}

func (f *fakeRepo) resetStaleRunningOptimizations(_ context.Context) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	failed := "failed"
	for id, u := range f.users {
		if u.OptimizationStatus != nil && *u.OptimizationStatus == "running" {
			u.OptimizationStatus = &failed
			f.users[id] = u
		}
	}
	return nil
}

func (f *fakeRepo) updateFSRSAfterOptimization(_ context.Context, arg db.UpdateUserFSRSAfterOptimizationParams) (db.User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	u, ok := f.users[arg.ID]
	if !ok {
		return db.User{}, pgx.ErrNoRows
	}
	u.FsrsParameters = arg.FsrsParameters
	u.DesiredRetention = arg.DesiredRetention
	status := "completed"
	u.OptimizationStatus = &status
	f.users[arg.ID] = u
	return u, nil
}

func newTestService() (*Service, *fakeRepo) {
	r := newFakeRepo()
	return &Service{
		r:         r,
		reviews:   fakeReviewLister{rows: nil},
		optimizer: fakeOptimizerRunner{},
	}, r
}

func seedUser(r *fakeRepo) db.User {
	u := db.User{
		ID:               uuid.New(),
		Email:            "a@b.com",
		Nickname:         "ab",
		FsrsParameters:   make([]float64, 21),
		DesiredRetention: 0.9,
	}
	r.users[u.ID] = u
	return u
}

func TestGetByIDReturnsUser(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	got, err := svc.GetByID(context.Background(), u.ID)
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if got.Email != u.Email {
		t.Errorf("email: got %q, want %q", got.Email, u.Email)
	}
}

func TestGetByIDUnknownReturnsNotFound(t *testing.T) {
	svc, _ := newTestService()
	_, err := svc.GetByID(context.Background(), uuid.New())
	if err != apperror.ErrUserNotFound {
		t.Errorf("expected ErrUserNotFound, got %v", err)
	}
}

func TestUpdateFSRSRejectsWrongWeightCount(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	_, err := svc.UpdateFSRS(context.Background(), u.ID, UpdateFSRSInput{
		Weights: make([]float64, 10), // wrong: need 21
	})
	if err == nil {
		t.Fatal("expected error for wrong weight count, got nil")
	}
}

func TestUpdateFSRSRejectsRetentionOutOfRange(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	for _, bad := range []float64{0.0, -0.1, 1.1} {
		v := bad
		_, err := svc.UpdateFSRS(context.Background(), u.ID, UpdateFSRSInput{
			DesiredRetention: &v,
		})
		if err == nil {
			t.Errorf("expected error for desired_retention=%.1f, got nil", bad)
		}
	}
}

func TestUpdateFSRSRejectsExplicitEmptyWeights(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	optimized := make([]float64, 21)
	for i := range optimized {
		optimized[i] = 0.42
	}
	u.FsrsParameters = optimized
	r.users[u.ID] = u

	_, err := svc.UpdateFSRS(context.Background(), u.ID, UpdateFSRSInput{
		Weights: []float64{}, // explicit empty array, not "omitted"
	})
	if err == nil {
		t.Fatal("expected error for explicit empty weights array, got nil")
	}

	got, getErr := svc.GetByID(context.Background(), u.ID)
	if getErr != nil {
		t.Fatalf("GetByID: %v", getErr)
	}
	if len(got.FSRSParameters) != 21 {
		t.Errorf("expected previously optimized weights to survive a rejected update, got len=%d", len(got.FSRSParameters))
	}
}

func TestUpdateFSRSOmittedWeightsKeepsExisting(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	optimized := make([]float64, 21)
	for i := range optimized {
		optimized[i] = 0.42
	}
	u.FsrsParameters = optimized
	r.users[u.ID] = u

	retention := 0.88
	got, err := svc.UpdateFSRS(context.Background(), u.ID, UpdateFSRSInput{DesiredRetention: &retention})
	if err != nil {
		t.Fatalf("UpdateFSRS: %v", err)
	}
	if len(got.FSRSParameters) != 21 || got.FSRSParameters[0] != 0.42 {
		t.Errorf("expected optimized weights to be preserved when weights is omitted, got %v", got.FSRSParameters)
	}
}

func TestUpdateClearsTimezoneWhenExplicitlySetToNil(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	tz := "America/Sao_Paulo"
	u.Timezone = &tz
	r.users[u.ID] = u

	got, err := svc.Update(context.Background(), u.ID, UpdateInput{Timezone: nil, TimezoneSet: true})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Timezone != nil {
		t.Errorf("expected timezone to be cleared back to default (nil), got %v", *got.Timezone)
	}
}

func TestUpdateOmittedTimezoneKeepsExisting(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	tz := "America/Sao_Paulo"
	u.Timezone = &tz
	r.users[u.ID] = u

	name := "New Name"
	got, err := svc.Update(context.Background(), u.ID, UpdateInput{Name: &name, TimezoneSet: false})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Timezone == nil || *got.Timezone != tz {
		t.Errorf("expected timezone to be preserved when not sent, got %v", got.Timezone)
	}
}

func TestUpdateEmailChangeResetsIsEmailVerified(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	u.IsEmailVerified = true
	r.users[u.ID] = u

	newEmail := "new-address@example.com"
	got, err := svc.Update(context.Background(), u.ID, UpdateInput{Email: &newEmail})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if got.Email != newEmail {
		t.Fatalf("Email: got %q, want %q", got.Email, newEmail)
	}
	if got.IsEmailVerified {
		t.Error("expected IsEmailVerified to be reset to false after changing to a new email")
	}
}

func TestUpdateSameEmailKeepsIsEmailVerified(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	u.IsEmailVerified = true
	r.users[u.ID] = u

	sameEmail := u.Email
	got, err := svc.Update(context.Background(), u.ID, UpdateInput{Email: &sameEmail})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if !got.IsEmailVerified {
		t.Error("expected IsEmailVerified to stay true when the email is resent unchanged")
	}
}

func TestUpdateOmittedEmailKeepsIsEmailVerified(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	u.IsEmailVerified = true
	r.users[u.ID] = u

	name := "New Name"
	got, err := svc.Update(context.Background(), u.ID, UpdateInput{Name: &name})
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if !got.IsEmailVerified {
		t.Error("expected IsEmailVerified to stay true when email is not part of the update")
	}
}

func TestUpdateReturnsConflictWhenEmailAlreadyInUse(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	r.updateErr = &pgconn.PgError{Code: "23505", ConstraintName: "ix_users_email"}

	newEmail := "taken@example.com"
	_, err := svc.Update(context.Background(), u.ID, UpdateInput{Email: &newEmail})

	var appErr *apperror.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected an *apperror.AppError, got %v (%T)", err, err)
	}
	if appErr.Status != 409 {
		t.Errorf("status: got %d, want 409", appErr.Status)
	}
	if appErr.Code != "EMAIL_ALREADY_IN_USE" {
		t.Errorf("code: got %q, want EMAIL_ALREADY_IN_USE", appErr.Code)
	}
}

func TestUpdateReturnsConflictWhenNicknameAlreadyInUse(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	r.updateErr = &pgconn.PgError{Code: "23505", ConstraintName: "ix_users_nickname"}

	newNickname := "taken"
	_, err := svc.Update(context.Background(), u.ID, UpdateInput{Nickname: &newNickname})

	var appErr *apperror.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("expected an *apperror.AppError, got %v (%T)", err, err)
	}
	if appErr.Status != 409 {
		t.Errorf("status: got %d, want 409", appErr.Status)
	}
	if appErr.Code != "NICKNAME_ALREADY_IN_USE" {
		t.Errorf("code: got %q, want NICKNAME_ALREADY_IN_USE", appErr.Code)
	}
}

func TestUpdateFSRSAcceptsValidWeights(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	weights := make([]float64, 21)
	for i := range weights {
		weights[i] = 0.5
	}
	got, err := svc.UpdateFSRS(context.Background(), u.ID, UpdateFSRSInput{Weights: weights})
	if err != nil {
		t.Fatalf("UpdateFSRS: %v", err)
	}
	if len(got.FSRSParameters) != 21 {
		t.Errorf("FSRSParameters len: got %d, want 21", len(got.FSRSParameters))
	}
}

func TestUpdateFSRSAcceptsValidRetention(t *testing.T) {
	svc, r := newTestService()
	u := seedUser(r)
	v := 0.85
	got, err := svc.UpdateFSRS(context.Background(), u.ID, UpdateFSRSInput{DesiredRetention: &v})
	if err != nil {
		t.Fatalf("UpdateFSRS: %v", err)
	}
	if got.DesiredRetention != 0.85 {
		t.Errorf("DesiredRetention: got %v, want 0.85", got.DesiredRetention)
	}
}
