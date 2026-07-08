package optimize

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestBuildInputGroupsByCard(t *testing.T) {
	cardA := uuid.New()
	cardB := uuid.New()
	now := time.Date(2025, 6, 1, 10, 0, 0, 0, time.UTC)

	input := BuildInput([]ReviewRow{
		{CardID: cardA, Rating: 3, ReviewDatetime: now},
		{CardID: cardA, Rating: 4, ReviewDatetime: now.Add(48 * time.Hour)},
		{CardID: cardB, Rating: 2, ReviewDatetime: now.Add(time.Hour)},
	}, 0.85)

	if len(input.Reviews) != 2 {
		t.Fatalf("reviews: got %d, want 2", len(input.Reviews))
	}
	if input.CurrentRetention != 0.85 {
		t.Fatalf("retention: got %v, want 0.85", input.CurrentRetention)
	}
	if input.Reviews[0].Entries[0].Rating != 3 {
		t.Fatalf("first rating: got %d, want 3", input.Reviews[0].Entries[0].Rating)
	}
}

func TestValidateRowsRejectsSmallHistory(t *testing.T) {
	rows := make([]ReviewRow, 10)
	if err := ValidateRows(rows); err == nil {
		t.Fatal("expected insufficient data error")
	}
}
