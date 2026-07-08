package fsrs

import (
	"testing"
	"time"

	gofsrs "github.com/open-spaced-repetition/go-fsrs/v4"
)

func TestNewCardStartsInNewState(t *testing.T) {
	s := New()
	c := s.NewCard()
	if c.State != "new" {
		t.Errorf("State: got %q, want %q", c.State, "new")
	}
}

func TestNextAppliesRating(t *testing.T) {
	s := New()
	c := s.NewCard()
	now := time.Now().UTC()

	updated, err := s.Next(c, now, RatingGood)
	if err != nil {
		t.Fatalf("Next: unexpected error: %v", err)
	}
	if updated.Reps != 1 {
		t.Errorf("Reps: got %d, want 1", updated.Reps)
	}
	if updated.Due.Before(now) {
		t.Error("Due must be after now")
	}
}

func TestRoundTripJSON(t *testing.T) {
	s := New()
	c := s.NewCard()
	updated, err := s.Next(c, time.Now().UTC(), RatingGood)
	if err != nil {
		t.Fatalf("Next: %v", err)
	}

	data, err := s.MarshalCard(updated)
	if err != nil {
		t.Fatalf("MarshalCard: %v", err)
	}
	restored, err := s.UnmarshalCard(data)
	if err != nil {
		t.Fatalf("UnmarshalCard: %v", err)
	}
	if restored.Reps != updated.Reps {
		t.Errorf("Reps after round-trip: got %d, want %d", restored.Reps, updated.Reps)
	}
}

func TestNextGoodRatingsProgressThroughLearningToReview(t *testing.T) {
	s := New()
	c := s.NewCard()
	now := time.Now().UTC()

	c, err := s.Next(c, now, RatingGood)
	if err != nil {
		t.Fatalf("Next: %v", err)
	}
	if c.State != "learning" {
		t.Fatalf("after first Good: State = %q, want %q", c.State, "learning")
	}
	now = c.Due

	c, err = s.Next(c, now, RatingGood)
	if err != nil {
		t.Fatalf("Next: %v", err)
	}
	if c.State != "review" {
		t.Fatalf("after second Good: State = %q, want %q", c.State, "review")
	}
	if c.Reps != 2 {
		t.Errorf("Reps: got %d, want 2", c.Reps)
	}
	if c.Stability <= 0 {
		t.Errorf("Stability must be positive, got %v", c.Stability)
	}
}

func TestNextAgainRatingIncrementsLapsesAndEntersRelearning(t *testing.T) {
	s := New()
	c := s.NewCard()
	now := time.Now().UTC()

	// Drive the card into the "review" state with a couple of Good ratings.
	for i := 0; i < 2; i++ {
		var err error
		c, err = s.Next(c, now, RatingGood)
		if err != nil {
			t.Fatalf("Next: %v", err)
		}
		now = c.Due
	}
	if c.State != "review" {
		t.Fatalf("precondition: State = %q, want %q", c.State, "review")
	}

	c, err := s.Next(c, now, RatingAgain)
	if err != nil {
		t.Fatalf("Next: %v", err)
	}
	if c.State != "relearning" {
		t.Errorf("State after Again on a review card: got %q, want %q", c.State, "relearning")
	}
	if c.Lapses != 1 {
		t.Errorf("Lapses: got %d, want 1", c.Lapses)
	}
}

func TestRetrievabilityDecreasesOverTime(t *testing.T) {
	s := New()
	c := s.NewCard()
	now := time.Now().UTC()
	c, err := s.Next(c, now, RatingGood)
	if err != nil {
		t.Fatalf("Next: %v", err)
	}

	soon, err := s.Retrievability(c, c.Due)
	if err != nil {
		t.Fatalf("Retrievability: %v", err)
	}
	later, err := s.Retrievability(c, c.Due.Add(60*24*time.Hour))
	if err != nil {
		t.Fatalf("Retrievability: %v", err)
	}
	if soon < 0 || soon > 1 {
		t.Errorf("Retrievability out of [0,1] bounds: %v", soon)
	}
	if later >= soon {
		t.Errorf("Retrievability should decay with elapsed time: at due=%v, +60d=%v", soon, later)
	}
}

func TestNewWithParametersDefaultsOnEmptyInputs(t *testing.T) {
	s, err := NewWithParameters(nil, 0)
	if err != nil {
		t.Fatalf("NewWithParameters: unexpected error: %v", err)
	}
	got := s.Params()
	want := New().Params()
	if got.DesiredRetention != want.DesiredRetention {
		t.Errorf("DesiredRetention: got %v, want %v", got.DesiredRetention, want.DesiredRetention)
	}
	if len(got.Weights) != len(want.Weights) {
		t.Fatalf("len(Weights): got %d, want %d", len(got.Weights), len(want.Weights))
	}
	for i := range got.Weights {
		if got.Weights[i] != want.Weights[i] {
			t.Errorf("Weights[%d]: got %v, want %v", i, got.Weights[i], want.Weights[i])
		}
	}
}

func TestNewWithParametersRejectsWrongWeightCount(t *testing.T) {
	_, err := NewWithParameters([]float64{1, 2, 3}, 0)
	if err == nil {
		t.Fatal("expected an error for an incorrect weight count, got nil")
	}
}

func TestNewWithParametersOverridesRetention(t *testing.T) {
	s, err := NewWithParameters(nil, 0.95)
	if err != nil {
		t.Fatalf("NewWithParameters: unexpected error: %v", err)
	}
	if got := s.Params().DesiredRetention; got != 0.95 {
		t.Errorf("DesiredRetention: got %v, want 0.95", got)
	}
}

func TestNewWithParametersIgnoresNonPositiveRetention(t *testing.T) {
	s, err := NewWithParameters(nil, -1)
	if err != nil {
		t.Fatalf("NewWithParameters: unexpected error: %v", err)
	}
	if got, want := s.Params().DesiredRetention, New().Params().DesiredRetention; got != want {
		t.Errorf("DesiredRetention: got %v, want default %v", got, want)
	}
}

func TestParamsReturnsIndependentCopyOfWeights(t *testing.T) {
	s := New()
	w := s.Params().Weights
	w[0] = -999

	again := s.Params().Weights
	if again[0] == -999 {
		t.Error("mutating the slice returned by Params must not affect the scheduler's internal weights")
	}
}

func TestUnmarshalCardInvalidJSONReturnsError(t *testing.T) {
	s := New()
	if _, err := s.UnmarshalCard([]byte("not json")); err == nil {
		t.Fatal("expected an error for invalid JSON, got nil")
	}
}

func TestMapStateBranches(t *testing.T) {
	cases := []struct {
		name  string
		state gofsrs.State
		isNew bool
		want  string
	}{
		{"forced new", gofsrs.Review, true, "new"},
		{"learning", gofsrs.Learning, false, "learning"},
		{"review", gofsrs.Review, false, "review"},
		{"relearning", gofsrs.Relearning, false, "relearning"},
		{"new state", gofsrs.New, false, "new"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := mapState(tc.state, tc.isNew); got != tc.want {
				t.Errorf("mapState(%v, %v) = %q, want %q", tc.state, tc.isNew, got, tc.want)
			}
		})
	}
}

func TestDaysBetween(t *testing.T) {
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	t.Run("zero time returns zero", func(t *testing.T) {
		if got := daysBetween(time.Time{}, base); got != 0 {
			t.Errorf("daysBetween(zero, base) = %d, want 0", got)
		}
	})
	t.Run("positive elapsed days", func(t *testing.T) {
		later := base.Add(72 * time.Hour)
		if got := daysBetween(base, later); got != 3 {
			t.Errorf("daysBetween(base, +72h) = %d, want 3", got)
		}
	})
	t.Run("negative elapsed clamps to zero", func(t *testing.T) {
		earlier := base.Add(-24 * time.Hour)
		if got := daysBetween(base, earlier); got != 0 {
			t.Errorf("daysBetween(base, -24h) = %d, want 0", got)
		}
	})
}
