package cards

import (
	"context"
	"errors"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

// fakeMediaOwnerChecker is a tiny in-memory mediaOwnerChecker for testing
// validateMediaOwnership without a database.
type fakeMediaOwnerChecker struct {
	ownerByURL map[string]uuid.UUID
	err        error
}

func (f *fakeMediaOwnerChecker) OwnerOfURL(_ context.Context, url string) (uuid.UUID, bool, error) {
	if f.err != nil {
		return uuid.UUID{}, false, f.err
	}
	owner, ok := f.ownerByURL[url]
	return owner, ok, nil
}

func TestValidateMediaOwnershipAllowsNilURL(t *testing.T) {
	s := &Service{media: &fakeMediaOwnerChecker{}}
	if err := s.validateMediaOwnership(context.Background(), uuid.New(), nil); err != nil {
		t.Errorf("expected nil URL to be allowed unconditionally, got %v", err)
	}
}

func TestValidateMediaOwnershipAllowsWhenCheckerNotWired(t *testing.T) {
	s := &Service{}
	url := "/api/v1/media/" + uuid.New().String()
	if err := s.validateMediaOwnership(context.Background(), uuid.New(), &url); err != nil {
		t.Errorf("expected validation to be skipped when no media checker is configured, got %v", err)
	}
}

func TestValidateMediaOwnershipAllowsMediaOwnedByUser(t *testing.T) {
	userID := uuid.New()
	url := "/api/v1/media/" + uuid.New().String()
	s := &Service{media: &fakeMediaOwnerChecker{ownerByURL: map[string]uuid.UUID{url: userID}}}
	if err := s.validateMediaOwnership(context.Background(), userID, &url); err != nil {
		t.Errorf("expected media owned by the requesting user to be allowed, got %v", err)
	}
}

func TestValidateMediaOwnershipRejectsMediaOwnedByAnotherUser(t *testing.T) {
	owner := uuid.New()
	requester := uuid.New()
	url := "/api/v1/media/" + uuid.New().String()
	s := &Service{media: &fakeMediaOwnerChecker{ownerByURL: map[string]uuid.UUID{url: owner}}}
	err := s.validateMediaOwnership(context.Background(), requester, &url)
	if err != apperror.ErrMediaNotFound {
		t.Errorf("expected ErrMediaNotFound for media owned by another user, got %v", err)
	}
}

func TestValidateMediaOwnershipRejectsUnknownURL(t *testing.T) {
	url := "/api/v1/media/" + uuid.New().String()
	s := &Service{media: &fakeMediaOwnerChecker{ownerByURL: map[string]uuid.UUID{}}}
	err := s.validateMediaOwnership(context.Background(), uuid.New(), &url)
	if err != apperror.ErrMediaNotFound {
		t.Errorf("expected ErrMediaNotFound for a URL that doesn't resolve to any media, got %v", err)
	}
}

func TestValidateMediaOwnershipPropagatesLookupError(t *testing.T) {
	url := "/api/v1/media/" + uuid.New().String()
	wantErr := errors.New("db down")
	s := &Service{media: &fakeMediaOwnerChecker{err: wantErr}}
	err := s.validateMediaOwnership(context.Background(), uuid.New(), &url)
	if err != wantErr {
		t.Errorf("expected the checker's error to propagate, got %v", err)
	}
}
