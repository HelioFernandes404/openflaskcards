package cards

import (
	"context"
	"fmt"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/google/uuid"
)

// ReviewPreviewOption describes the outcome of applying a single rating
// without persisting it.
type ReviewPreviewOption struct {
	Rating         int       `json:"rating"`
	RatingName     string    `json:"ratingName"`
	IntervalDays   float64   `json:"intervalDays"`
	IntervalString string    `json:"intervalString"`
	Due            time.Time `json:"due"`
	Stability      float64   `json:"stability"`
	Difficulty     float64   `json:"difficulty"`
}

// ReviewPreview holds the current retrievability and the simulated outcome
// for each of the four FSRS ratings.
type ReviewPreview struct {
	CardID                uuid.UUID             `json:"cardId"`
	CurrentRetrievability float64               `json:"currentRetrievability"`
	Options               []ReviewPreviewOption `json:"options"`
}

// previewRatings enumerates the ratings simulated by PreviewReview, in
// display order.
var previewRatings = []struct {
	rating fsrs.Rating
	name   string
}{
	{fsrs.RatingAgain, "Again"},
	{fsrs.RatingHard, "Hard"},
	{fsrs.RatingGood, "Good"},
	{fsrs.RatingEasy, "Easy"},
}

// PreviewReview simulates the FSRS outcome for each rating (Again, Hard,
// Good, Easy) without persisting any change to the card.
func (s *Service) PreviewReview(ctx context.Context, id, userID uuid.UUID) (ReviewPreview, error) {
	card, err := s.GetByID(ctx, id, userID)
	if err != nil {
		return ReviewPreview{}, err
	}

	fsrsCard, err := s.loadFSRSCard(card)
	if err != nil {
		return ReviewPreview{}, fmt.Errorf("preview review: unmarshal card: %w", err)
	}

	scheduler := s.schedulerFor(ctx, userID)
	now := time.Now().UTC()

	var retrievability float64
	if card.Reps > 0 {
		retrievability, err = scheduler.Retrievability(fsrsCard, now)
		if err != nil {
			return ReviewPreview{}, fmt.Errorf("preview review: retrievability: %w", err)
		}
	}

	options := make([]ReviewPreviewOption, 0, len(previewRatings))
	for _, r := range previewRatings {
		simulated, err := scheduler.Next(fsrsCard, now, r.rating)
		if err != nil {
			return ReviewPreview{}, fmt.Errorf("preview review: next: %w", err)
		}
		intervalDays := simulated.Due.Sub(now).Hours() / 24
		options = append(options, ReviewPreviewOption{
			Rating:         int(r.rating),
			RatingName:     r.name,
			IntervalDays:   intervalDays,
			IntervalString: formatIntervalDays(intervalDays),
			Due:            simulated.Due,
			Stability:      simulated.Stability,
			Difficulty:     simulated.Difficulty,
		})
	}

	return ReviewPreview{
		CardID:                card.ID,
		CurrentRetrievability: retrievability,
		Options:               options,
	}, nil
}

// formatIntervalDays renders a day count as a short human-readable string.
func formatIntervalDays(days float64) string {
	roundAtLeastOne := func(value float64) int {
		return max(int(value+0.5), 1)
	}
	switch {
	case days < 1:
		return fmt.Sprintf("%dm", roundAtLeastOne(days*24*60))
	case days < 30:
		return fmt.Sprintf("%dd", roundAtLeastOne(days))
	case days < 365:
		return fmt.Sprintf("%dmo", roundAtLeastOne(days/30))
	default:
		return fmt.Sprintf("%dy", roundAtLeastOne(days/365))
	}
}
