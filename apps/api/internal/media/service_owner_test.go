package media

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestOwnerOfURLReturnsOwnerForExistingMedia(t *testing.T) {
	repo := newFakeRepo()
	owner := uuid.New()
	m := Media{ID: uuid.New(), UserID: owner}
	repo.rows[m.ID] = m
	s := NewService(repo, t.TempDir(), 1<<20)

	gotOwner, ok, err := s.OwnerOfURL(context.Background(), m.URL())
	if err != nil {
		t.Fatalf("OwnerOfURL: %v", err)
	}
	if !ok {
		t.Fatal("expected ok=true for an existing media URL")
	}
	if gotOwner != owner {
		t.Errorf("owner: got %v, want %v", gotOwner, owner)
	}
}

func TestOwnerOfURLReportsNotOkForUnknownMedia(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo, t.TempDir(), 1<<20)

	_, ok, err := s.OwnerOfURL(context.Background(), urlPrefix+uuid.New().String())
	if err != nil {
		t.Fatalf("OwnerOfURL: %v", err)
	}
	if ok {
		t.Error("expected ok=false for a media id that doesn't exist")
	}
}

func TestOwnerOfURLReportsNotOkForNonMediaURL(t *testing.T) {
	repo := newFakeRepo()
	s := NewService(repo, t.TempDir(), 1<<20)

	cases := []string{
		"not-a-url-at-all",
		"/api/v1/other/" + uuid.New().String(),
		urlPrefix + "not-a-uuid",
	}
	for _, url := range cases {
		_, ok, err := s.OwnerOfURL(context.Background(), url)
		if err != nil {
			t.Errorf("url %q: unexpected error %v", url, err)
		}
		if ok {
			t.Errorf("url %q: expected ok=false for a non-media URL", url)
		}
	}
}
