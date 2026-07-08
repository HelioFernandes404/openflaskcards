package media

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// urlPrefix is the public API path under which media is served.
// The stored card reference and the response URL both use this prefix.
const urlPrefix = "/api/v1/media/"

// Media is the domain representation of a stored media row.
// storagePath is intentionally unexported in the JSON contract and never
// leaves the API in a response.
type Media struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	Kind             string
	StoragePath      string
	OriginalFilename *string
	ContentType      string
	SizeBytes        int64
	CreatedAt        time.Time
}

// URL returns the public, authenticated media URL for this row.
func (m Media) URL() string {
	return urlPrefix + m.ID.String()
}

// CreateMediaParams carries the fields the repository needs to persist a row.
type CreateMediaParams struct {
	ID               uuid.UUID
	UserID           uuid.UUID
	Kind             string
	StoragePath      string
	OriginalFilename *string
	ContentType      string
	SizeBytes        int64
}

// Repository abstracts media persistence so the service can be unit-tested
// with an in-memory fake.
type Repository interface {
	CreateMedia(ctx context.Context, p CreateMediaParams) (Media, error)
	GetMediaByID(ctx context.Context, id uuid.UUID) (Media, error)
	DeleteMedia(ctx context.Context, id, userID uuid.UUID) error
	CountCardsReferencingURL(ctx context.Context, url string) (int64, error)
}
