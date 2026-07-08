package media

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

// fakeRepo is an in-memory media repository for unit tests.
type fakeRepo struct {
	rows      map[uuid.UUID]Media
	refCounts map[string]int64
	createErr error
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{rows: make(map[uuid.UUID]Media), refCounts: make(map[string]int64)}
}

func (f *fakeRepo) CreateMedia(_ context.Context, p CreateMediaParams) (Media, error) {
	if f.createErr != nil {
		return Media{}, f.createErr
	}
	m := Media{
		ID: p.ID, UserID: p.UserID, Kind: p.Kind, StoragePath: p.StoragePath,
		OriginalFilename: p.OriginalFilename, ContentType: p.ContentType, SizeBytes: p.SizeBytes,
	}
	f.rows[p.ID] = m
	return m, nil
}

func (f *fakeRepo) GetMediaByID(_ context.Context, id uuid.UUID) (Media, error) {
	m, ok := f.rows[id]
	if !ok {
		return Media{}, apperror.ErrMediaNotFound
	}
	return m, nil
}

func (f *fakeRepo) DeleteMedia(_ context.Context, id, userID uuid.UUID) error {
	m, ok := f.rows[id]
	if !ok || m.UserID != userID {
		return nil
	}
	delete(f.rows, id)
	return nil
}

func (f *fakeRepo) CountCardsReferencingURL(_ context.Context, url string) (int64, error) {
	return f.refCounts[url], nil
}

// --- test image fixtures (valid magic bytes for http.DetectContentType) ---

func pngBytes() []byte {
	return append([]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, make([]byte, 16)...)
}

func jpegBytes() []byte {
	return append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, make([]byte, 16)...)
}

func gifBytes() []byte {
	return append([]byte("GIF89a"), make([]byte, 16)...)
}

func webpBytes() []byte {
	b := []byte("RIFF")
	b = append(b, 0x00, 0x00, 0x00, 0x00)
	b = append(b, []byte("WEBPVP8 ")...)
	b = append(b, make([]byte, 16)...)
	return b
}

func newTestService(t *testing.T, repo Repository) (*Service, string) {
	t.Helper()
	dir := t.TempDir()
	return NewService(repo, dir, 10*1024*1024), dir
}

func TestUploadAcceptsPNG(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: pngBytes(), OriginalFilename: "a.png"})
	if err != nil {
		t.Fatalf("upload png: %v", err)
	}
	if m.ContentType != "image/png" {
		t.Errorf("content type = %q, want image/png", m.ContentType)
	}
}

func TestUploadAcceptsJPEG(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: jpegBytes()})
	if err != nil {
		t.Fatalf("upload jpeg: %v", err)
	}
	if m.ContentType != "image/jpeg" {
		t.Errorf("content type = %q, want image/jpeg", m.ContentType)
	}
}

func TestUploadAcceptsWebP(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: webpBytes()})
	if err != nil {
		t.Fatalf("upload webp: %v", err)
	}
	if m.ContentType != "image/webp" {
		t.Errorf("content type = %q, want image/webp", m.ContentType)
	}
}

func TestUploadAcceptsGIF(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: gifBytes()})
	if err != nil {
		t.Fatalf("upload gif: %v", err)
	}
	if m.ContentType != "image/gif" {
		t.Errorf("content type = %q, want image/gif", m.ContentType)
	}
}

func TestUploadRejectsOverMaxSize(t *testing.T) {
	repo := newFakeRepo()
	dir := t.TempDir()
	svc := NewService(repo, dir, 8) // 8 bytes max
	_, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: pngBytes()})
	if !errors.Is(err, apperror.ErrMediaTooLarge) {
		t.Fatalf("err = %v, want ErrMediaTooLarge", err)
	}
}

func TestUploadRejectsNonImageBytes(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	_, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: []byte("this is plain text not an image at all")})
	if !errors.Is(err, apperror.ErrUnsupportedMediaType) {
		t.Fatalf("err = %v, want ErrUnsupportedMediaType", err)
	}
}

func TestUploadWritesFileUnderUserDir(t *testing.T) {
	userID := uuid.New()
	svc, dir := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: userID, Data: pngBytes()})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	want := filepath.Join(dir, userID.String(), m.ID.String()+".png")
	if _, err := os.Stat(want); err != nil {
		t.Fatalf("expected file at %s: %v", want, err)
	}
}

func TestUploadCreatesRowWithOwnerAndMetadata(t *testing.T) {
	userID := uuid.New()
	repo := newFakeRepo()
	svc, _ := newTestService(t, repo)
	data := pngBytes()
	m, err := svc.Upload(context.Background(), UploadInput{UserID: userID, Data: data, OriginalFilename: "apple.png"})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	row, ok := repo.rows[m.ID]
	if !ok {
		t.Fatal("media row not stored")
	}
	if row.UserID != userID {
		t.Errorf("owner = %v, want %v", row.UserID, userID)
	}
	if row.Kind != "image" {
		t.Errorf("kind = %q, want image", row.Kind)
	}
	if row.SizeBytes != int64(len(data)) {
		t.Errorf("size = %d, want %d", row.SizeBytes, len(data))
	}
	if row.OriginalFilename == nil || *row.OriginalFilename != "apple.png" {
		t.Errorf("original filename not recorded: %v", row.OriginalFilename)
	}
}

func TestGetReturnsBytesForOwner(t *testing.T) {
	userID := uuid.New()
	svc, _ := newTestService(t, newFakeRepo())
	data := pngBytes()
	m, err := svc.Upload(context.Background(), UploadInput{UserID: userID, Data: data})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	got, raw, err := svc.GetWithBytes(context.Background(), m.ID, userID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.ContentType != "image/png" {
		t.Errorf("content type = %q", got.ContentType)
	}
	if len(raw) != len(data) {
		t.Errorf("bytes len = %d, want %d", len(raw), len(data))
	}
}

func TestGetRejectsAnotherUser(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: pngBytes()})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	_, _, err = svc.GetWithBytes(context.Background(), m.ID, uuid.New())
	if !errors.Is(err, apperror.ErrMediaNotFound) {
		t.Fatalf("err = %v, want ErrMediaNotFound", err)
	}
}

func TestDeleteRejectsAnotherUser(t *testing.T) {
	svc, _ := newTestService(t, newFakeRepo())
	m, err := svc.Upload(context.Background(), UploadInput{UserID: uuid.New(), Data: pngBytes()})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	err = svc.Delete(context.Background(), m.ID, uuid.New())
	if !errors.Is(err, apperror.ErrMediaNotFound) {
		t.Fatalf("err = %v, want ErrMediaNotFound", err)
	}
}

func TestDeleteBlocksWhenReferenced(t *testing.T) {
	userID := uuid.New()
	repo := newFakeRepo()
	svc, _ := newTestService(t, repo)
	m, err := svc.Upload(context.Background(), UploadInput{UserID: userID, Data: pngBytes()})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	repo.refCounts[m.URL()] = 2
	err = svc.Delete(context.Background(), m.ID, userID)
	if !errors.Is(err, apperror.ErrMediaInUse) {
		t.Fatalf("err = %v, want ErrMediaInUse", err)
	}
	if _, ok := repo.rows[m.ID]; !ok {
		t.Error("row should not be deleted when referenced")
	}
}

func TestDeleteRemovesRowAndFileWhenUnreferenced(t *testing.T) {
	userID := uuid.New()
	repo := newFakeRepo()
	svc, dir := newTestService(t, repo)
	m, err := svc.Upload(context.Background(), UploadInput{UserID: userID, Data: pngBytes()})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	path := filepath.Join(dir, m.StoragePath)
	if err := svc.Delete(context.Background(), m.ID, userID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, ok := repo.rows[m.ID]; ok {
		t.Error("row not deleted")
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("file should be removed, stat err = %v", err)
	}
}

func TestDeleteSucceedsWhenFileMissing(t *testing.T) {
	userID := uuid.New()
	repo := newFakeRepo()
	svc, dir := newTestService(t, repo)
	m, err := svc.Upload(context.Background(), UploadInput{UserID: userID, Data: pngBytes()})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	// remove the file out-of-band so only the DB row remains
	if err := os.Remove(filepath.Join(dir, m.StoragePath)); err != nil {
		t.Fatalf("setup remove: %v", err)
	}
	if err := svc.Delete(context.Background(), m.ID, userID); err != nil {
		t.Fatalf("delete with missing file should succeed: %v", err)
	}
	if _, ok := repo.rows[m.ID]; ok {
		t.Error("row not deleted")
	}
}
