package optimize

import (
	"time"

	"github.com/google/uuid"
)

const (
	MinReviewRows = 100
	MinTrainItems = 50
)

// ReviewRow is a single review log entry for optimizer export.
type ReviewRow struct {
	CardID         uuid.UUID
	Rating         int32
	ReviewDatetime time.Time
}

// CardReviews groups review entries for one card.
type CardReviews struct {
	CardID  string        `json:"card_id"`
	Entries []ReviewEntry `json:"entries"`
}

// ReviewEntry is one review in optimizer input.
type ReviewEntry struct {
	At     time.Time `json:"at"`
	Rating int32     `json:"rating"`
}

// Input is the JSON payload sent to the fsrs-rs sidecar.
type Input struct {
	Reviews          []CardReviews `json:"reviews"`
	CurrentRetention float64       `json:"current_retention"`
}

// Result is the JSON payload returned by the fsrs-rs sidecar.
type Result struct {
	Weights           []float64 `json:"weights"`
	OptimalRetention  float64   `json:"optimal_retention"`
	TrainItems        int       `json:"train_items"`
}

// BuildInput groups flat review rows into sidecar JSON input.
func BuildInput(rows []ReviewRow, currentRetention float64) Input {
	if currentRetention <= 0 {
		currentRetention = 0.9
	}

	byCard := make(map[uuid.UUID][]ReviewEntry)
	order := make([]uuid.UUID, 0)

	for _, row := range rows {
		if _, ok := byCard[row.CardID]; !ok {
			order = append(order, row.CardID)
		}
		byCard[row.CardID] = append(byCard[row.CardID], ReviewEntry{
			At:     row.ReviewDatetime.UTC(),
			Rating: row.Rating,
		})
	}

	reviews := make([]CardReviews, 0, len(order))
	for _, cardID := range order {
		entries := byCard[cardID]
		if len(entries) == 0 {
			continue
		}
		reviews = append(reviews, CardReviews{
			CardID:  cardID.String(),
			Entries: entries,
		})
	}

	return Input{
		Reviews:          reviews,
		CurrentRetention: currentRetention,
	}
}
