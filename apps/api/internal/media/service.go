package media

import (
	"context"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/google/uuid"
)

// kindImage is the only media kind supported in v1.
const kindImage = "image"

// allowedImageTypes maps an accepted, byte-detected MIME type to its file
// extension. Detection is done from file bytes, never the filename or header.
var allowedImageTypes = map[string]string{
	"image/png":  "png",
	"image/jpeg": "jpg",
	"image/webp": "webp",
	"image/gif":  "gif",
}

// Service holds media business logic: validation, path generation, file IO,
// ownership checks, and delete rules.
type Service struct {
	repo     Repository
	mediaDir string
	maxBytes int64
}

// NewService builds a media service rooted at mediaDir with a max upload size.
func NewService(repo Repository, mediaDir string, maxBytes int64) *Service {
	return &Service{repo: repo, mediaDir: mediaDir, maxBytes: maxBytes}
}

// MaxBytes is the largest accepted upload size in bytes. Handlers use it to
// bound the request body before buffering it into memory.
func (s *Service) MaxBytes() int64 { return s.maxBytes }

// UploadInput is the raw upload payload accepted by the service.
type UploadInput struct {
	UserID           uuid.UUID
	Data             []byte
	OriginalFilename string
}

// Upload validates image bytes, writes them under a user-scoped directory, and
// records a media row. The MIME type is detected from the bytes themselves.
func (s *Service) Upload(ctx context.Context, in UploadInput) (Media, error) {
	if len(in.Data) == 0 {
		return Media{}, apperror.New(apperror.ErrValidation.Code, apperror.ErrValidation.Status, "file is required")
	}
	if int64(len(in.Data)) > s.maxBytes {
		return Media{}, apperror.ErrMediaTooLarge
	}
	contentType := http.DetectContentType(in.Data)
	ext, ok := allowedImageTypes[contentType]
	if !ok {
		return Media{}, apperror.ErrUnsupportedMediaType
	}

	mediaID := uuid.New()
	storagePath := filepath.Join(in.UserID.String(), mediaID.String()+"."+ext)
	absPath := filepath.Join(s.mediaDir, storagePath)
	if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
		return Media{}, err
	}
	if err := os.WriteFile(absPath, in.Data, 0o644); err != nil {
		return Media{}, err
	}

	var origFilename *string
	if in.OriginalFilename != "" {
		origFilename = &in.OriginalFilename
	}
	row, err := s.repo.CreateMedia(ctx, CreateMediaParams{
		ID:               mediaID,
		UserID:           in.UserID,
		Kind:             kindImage,
		StoragePath:      storagePath,
		OriginalFilename: origFilename,
		ContentType:      contentType,
		SizeBytes:        int64(len(in.Data)),
	})
	if err != nil {
		_ = os.Remove(absPath)
		return Media{}, err
	}
	return row, nil
}

// GetWithBytes returns the media metadata and its raw bytes for the owner.
// Media owned by another user returns MEDIA_NOT_FOUND to avoid leaking
// existence.
func (s *Service) GetWithBytes(ctx context.Context, id, userID uuid.UUID) (Media, []byte, error) {
	m, err := s.repo.GetMediaByID(ctx, id)
	if err != nil {
		return Media{}, nil, err
	}
	if m.UserID != userID {
		return Media{}, nil, apperror.ErrMediaNotFound
	}
	data, err := os.ReadFile(s.absPath(m))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Media{}, nil, apperror.ErrMediaNotFound
		}
		return Media{}, nil, err
	}
	return m, data, nil
}

// Delete removes an owned media row and its file. It is blocked when any card
// references the media URL. A missing file does not block row deletion.
func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	m, err := s.repo.GetMediaByID(ctx, id)
	if err != nil {
		return err
	}
	if m.UserID != userID {
		return apperror.ErrMediaNotFound
	}
	count, err := s.repo.CountCardsReferencingURL(ctx, m.URL())
	if err != nil {
		return err
	}
	if count > 0 {
		return apperror.ErrMediaInUse
	}
	if err := os.Remove(s.absPath(m)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return s.repo.DeleteMedia(ctx, id, userID)
}

func (s *Service) absPath(m Media) string {
	return filepath.Join(s.mediaDir, m.StoragePath)
}

// OwnerOfURL resolves a previously issued Media.URL() back to the user that
// owns it, so other features (e.g. cards) can verify a client-submitted
// audioUrl/imagemUrl actually belongs to the requesting user before storing
// it. ok is false when url isn't a valid media URL or the media doesn't
// exist — callers should treat that the same as "not owned by this user".
func (s *Service) OwnerOfURL(ctx context.Context, url string) (userID uuid.UUID, ok bool, err error) {
	idStr, found := strings.CutPrefix(url, urlPrefix)
	if !found {
		return uuid.UUID{}, false, nil
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return uuid.UUID{}, false, nil
	}
	m, err := s.repo.GetMediaByID(ctx, id)
	if err != nil {
		if errors.Is(err, apperror.ErrMediaNotFound) {
			return uuid.UUID{}, false, nil
		}
		return uuid.UUID{}, false, err
	}
	return m.UserID, true, nil
}
