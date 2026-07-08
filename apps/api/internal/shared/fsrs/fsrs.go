// Package fsrs is a thin wrapper around github.com/open-spaced-repetition/go-fsrs/v4
// providing a domain-friendly Card projection (with string State) and JSON
// round-trip helpers, while preserving full algorithmic fidelity via the
// embedded library Card.
package fsrs

import (
	"encoding/json"
	"fmt"
	"time"

	gofsrs "github.com/open-spaced-repetition/go-fsrs/v4"
)

// Rating mirrors gofsrs.Rating for callers that don't want to import the lib.
type Rating int

const (
	RatingAgain Rating = 1
	RatingHard  Rating = 2
	RatingGood  Rating = 3
	RatingEasy  Rating = 4
)

// Card is the domain projection of an FSRS card. State is exposed as a string
// for convenient API/JSON contracts. The underlying go-fsrs Card is preserved
// in Inner so subsequent scheduling calls retain full fidelity.
type Card struct {
	State         string      `json:"state"`
	Stability     float64     `json:"stability"`
	Difficulty    float64     `json:"difficulty"`
	Due           time.Time   `json:"due"`
	LastReview    time.Time   `json:"last_review"`
	Reps          int         `json:"reps"`
	Lapses        int         `json:"lapses"`
	ScheduledDays int         `json:"scheduled_days"`
	ElapsedDays   int         `json:"elapsed_days"`
	Inner         gofsrs.Card `json:"inner"`
}

// Scheduler wraps a configured *gofsrs.FSRS.
type Scheduler struct {
	f *gofsrs.FSRS
}

// SchedulerParams exposes the active FSRS configuration for inspection.
type SchedulerParams struct {
	Weights          []float64 `json:"weights"`
	DesiredRetention float64   `json:"desired_retention"`
}

// Params returns the weights and desired retention currently in use.
func (s *Scheduler) Params() SchedulerParams {
	w := make([]float64, len(s.f.W))
	copy(w, s.f.W[:])
	return SchedulerParams{
		Weights:          w,
		DesiredRetention: s.f.RequestRetention,
	}
}

// New returns a Scheduler configured with go-fsrs default parameters.
func New() *Scheduler {
	return &Scheduler{f: gofsrs.NewFSRS(gofsrs.DefaultParam())}
}

// NewWithParameters allows per-user FSRS parameters. If weights is non-empty
// it must have exactly len(gofsrs.Weights) entries. If desiredRetention is
// > 0 it overrides the default RequestRetention.
func NewWithParameters(weights []float64, desiredRetention float64) (*Scheduler, error) {
	params := gofsrs.DefaultParam()
	if len(weights) > 0 {
		if len(weights) != len(params.W) {
			return nil, fmt.Errorf("fsrs: expected %d weights, got %d", len(params.W), len(weights))
		}
		var w gofsrs.Weights
		copy(w[:], weights)
		params.W = w
	}
	if desiredRetention > 0 {
		params.RequestRetention = desiredRetention
	}
	return &Scheduler{f: gofsrs.NewFSRS(params)}, nil
}

// NewCard returns a fresh Card in the "new" state.
func (s *Scheduler) NewCard() Card {
	inner := gofsrs.NewCard()
	return Card{
		State:      "new",
		Difficulty: inner.Difficulty,
		Stability:  inner.Stability,
		Due:        inner.Due,
		Inner:      inner,
	}
}

// Next applies a rating at the given time and returns the updated Card.
func (s *Scheduler) Next(c Card, now time.Time, rating Rating) (Card, error) {
	info, err := s.f.Next(c.Inner, now, gofsrs.Rating(rating))
	if err != nil {
		return Card{}, fmt.Errorf("fsrs: next: %w", err)
	}
	wasNew := c.Inner.State == gofsrs.New && c.Reps == 0
	return Card{
		State:         mapState(info.Card.State, wasNew && info.Card.State == gofsrs.New),
		Stability:     info.Card.Stability,
		Difficulty:    info.Card.Difficulty,
		Due:           info.Card.Due,
		LastReview:    info.Card.LastReview,
		Reps:          int(info.Card.Reps),
		Lapses:        int(info.Card.Lapses),
		ScheduledDays: int(info.Card.ScheduledDays),
		ElapsedDays:   daysBetween(c.Inner.LastReview, now),
		Inner:         info.Card,
	}, nil
}

// Retrievability returns the current probability of recall.
func (s *Scheduler) Retrievability(c Card, now time.Time) (float64, error) {
	return s.f.GetRetrievability(c.Inner, now)
}

// MarshalCard serializes a Card to JSON.
func (s *Scheduler) MarshalCard(c Card) ([]byte, error) {
	return json.Marshal(c)
}

// UnmarshalCard deserializes a Card from JSON.
func (s *Scheduler) UnmarshalCard(data []byte) (Card, error) {
	var c Card
	if err := json.Unmarshal(data, &c); err != nil {
		return Card{}, fmt.Errorf("fsrs: unmarshal: %w", err)
	}
	return c, nil
}

func mapState(state gofsrs.State, isNew bool) string {
	if isNew {
		return "new"
	}
	switch state {
	case gofsrs.Learning:
		return "learning"
	case gofsrs.Review:
		return "review"
	case gofsrs.Relearning:
		return "relearning"
	case gofsrs.New:
		return "new"
	default:
		return "new"
	}
}

func daysBetween(a, b time.Time) int {
	if a.IsZero() {
		return 0
	}
	d := b.Sub(a).Hours() / 24
	if d < 0 {
		return 0
	}
	return int(d)
}
