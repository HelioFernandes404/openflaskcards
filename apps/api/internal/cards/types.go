package cards

import (
	"time"

	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
)

type Card struct {
	ID           uuid.UUID
	DeckID       uuid.UUID
	Front        string
	Back         string
	AudioURL     *string
	ImagemURL    *string
	Phonetic     *string
	TTSEnabled   bool
	State        string
	Stability    float64
	Difficulty   float64
	Due          time.Time
	LastReview   *time.Time
	Reps         int32
	Lapses       int32
	FsrsCardJSON *string
	RowVersion   int32
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func mapDueCardRow(row db.ListDueCardsByDeckRow) Card {
	return mapCard(db.Card{
		ID:           row.ID,
		DeckID:       row.DeckID,
		Front:        row.Front,
		Back:         row.Back,
		AudioUrl:     row.AudioUrl,
		ImagemUrl:    row.ImagemUrl,
		Fonetica:     row.Fonetica,
		TtsEnabled:   row.TtsEnabled,
		State:        row.State,
		Stability:    row.Stability,
		Difficulty:   row.Difficulty,
		Due:          row.Due,
		LastReview:   row.LastReview,
		Reps:         row.Reps,
		Lapses:       row.Lapses,
		FsrsCardJson: row.FsrsCardJson,
		RowVersion:   row.RowVersion,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	})
}

func mapCard(row db.Card) Card {
	return Card{
		ID:           row.ID,
		DeckID:       row.DeckID,
		Front:        row.Front,
		Back:         row.Back,
		AudioURL:     row.AudioUrl,
		ImagemURL:    row.ImagemUrl,
		Phonetic:     row.Fonetica,
		TTSEnabled:   row.TtsEnabled,
		State:        row.State,
		Stability:    row.Stability,
		Difficulty:   row.Difficulty,
		Due:          row.Due,
		LastReview:   row.LastReview,
		Reps:         row.Reps,
		Lapses:       row.Lapses,
		FsrsCardJSON: row.FsrsCardJson,
		RowVersion:   row.RowVersion,
		CreatedAt:    row.CreatedAt,
		UpdatedAt:    row.UpdatedAt,
	}
}
