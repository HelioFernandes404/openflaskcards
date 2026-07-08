package cards

import (
	"context"
	"fmt"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/google/uuid"
)

// FSRSDebugResult holds the full FSRS inspection payload for a card.
type FSRSDebugResult struct {
	Params         fsrs.SchedulerParams `json:"params"`
	CardState      fsrs.Card            `json:"card_state"`
	Retrievability *float64             `json:"retrievability"`
	Simulation     map[string]fsrs.Card `json:"simulation"`
}

// FSRSDebug returns FSRS internals for a single card: active parameters,
// parsed card state, current retrievability, and a simulation of all four ratings.
func (s *Service) FSRSDebug(ctx context.Context, id, userID uuid.UUID) (FSRSDebugResult, error) {
	card, err := s.GetByID(ctx, id, userID)
	if err != nil {
		return FSRSDebugResult{}, err
	}

	fsrsCard, err := s.loadFSRSCard(card)
	if err != nil {
		return FSRSDebugResult{}, fmt.Errorf("fsrs debug: unmarshal card: %w", err)
	}

	scheduler := s.schedulerFor(ctx, userID)

	result := FSRSDebugResult{
		Params:     scheduler.Params(),
		CardState:  fsrsCard,
		Simulation: make(map[string]fsrs.Card, 4),
	}

	now := time.Now().UTC()

	if card.Reps > 0 {
		r, err := scheduler.Retrievability(fsrsCard, now)
		if err == nil {
			result.Retrievability = &r
		}
	}

	for name, rating := range map[string]fsrs.Rating{
		"again": fsrs.RatingAgain,
		"hard":  fsrs.RatingHard,
		"good":  fsrs.RatingGood,
		"easy":  fsrs.RatingEasy,
	} {
		simulated, err := scheduler.Next(fsrsCard, now, rating)
		if err == nil {
			result.Simulation[name] = simulated
		}
	}

	return result, nil
}
