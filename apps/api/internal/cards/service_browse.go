package cards

import (
	"context"
	"time"

	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
)

type BrowseFilterOption struct {
	Type  string
	Value string
	Label string
	Count int64
}

type BrowseFilterSection struct {
	ID      string
	Title   string
	Options []BrowseFilterOption
}

type BrowseFilters struct {
	TotalCards int64
	Sections   []BrowseFilterSection
}

type BrowseQuery struct {
	FilterType  string
	FilterValue string
}

var browseStateOptions = []BrowseFilterOption{
	{Type: "state", Value: "new", Label: "New"},
	{Type: "state", Value: "learning", Label: "Learning"},
	{Type: "state", Value: "review", Label: "Review"},
	{Type: "state", Value: "relearning", Label: "Relearning"},
}

var browseTodayOptions = []BrowseFilterOption{
	{Type: "today", Value: "due", Label: "Due"},
	{Type: "today", Value: "added", Label: "Added"},
	{Type: "today", Value: "edited", Label: "Edited"},
}

var browseTagOptions = []BrowseFilterOption{
	{Type: "tag", Value: "untagged", Label: "Untagged"},
}

func startOfDayUTC(now time.Time) time.Time {
	y, m, d := now.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func (s *Service) BrowseFilters(ctx context.Context, userID uuid.UUID) (BrowseFilters, error) {
	now := time.Now().UTC()
	dayStart := startOfDayUTC(now)

	total, err := s.q.CountUserCards(ctx, userID)
	if err != nil {
		return BrowseFilters{}, err
	}

	stateRows, err := s.q.CountUserCardsByState(ctx, userID)
	if err != nil {
		return BrowseFilters{}, err
	}
	stateCounts := make(map[string]int64, len(stateRows))
	for _, row := range stateRows {
		stateCounts[row.State] = row.Count
	}

	dueCount, err := s.q.CountUserCardsDueBy(ctx, db.CountUserCardsDueByParams{
		UserID: userID,
		Due:    now,
	})
	if err != nil {
		return BrowseFilters{}, err
	}

	addedCount, err := s.q.CountUserCardsCreatedSince(ctx, db.CountUserCardsCreatedSinceParams{
		UserID:    userID,
		CreatedAt: dayStart,
	})
	if err != nil {
		return BrowseFilters{}, err
	}

	editedCount, err := s.q.CountUserCardsEditedSince(ctx, db.CountUserCardsEditedSinceParams{
		UserID:    userID,
		UpdatedAt: dayStart,
	})
	if err != nil {
		return BrowseFilters{}, err
	}

	untaggedCount, err := s.q.CountUserCardsInUntaggedDecks(ctx, userID)
	if err != nil {
		return BrowseFilters{}, err
	}

	stateSection := make([]BrowseFilterOption, 0, len(browseStateOptions))
	for _, opt := range browseStateOptions {
		opt.Count = stateCounts[opt.Value]
		stateSection = append(stateSection, opt)
	}

	todaySection := make([]BrowseFilterOption, 0, len(browseTodayOptions))
	for _, opt := range browseTodayOptions {
		switch opt.Value {
		case "due":
			opt.Count = dueCount
		case "added":
			opt.Count = addedCount
		case "edited":
			opt.Count = editedCount
		}
		todaySection = append(todaySection, opt)
	}

	tagSection := make([]BrowseFilterOption, 0, len(browseTagOptions))
	for _, opt := range browseTagOptions {
		opt.Count = untaggedCount
		tagSection = append(tagSection, opt)
	}

	return BrowseFilters{
		TotalCards: total,
		Sections: []BrowseFilterSection{
			{ID: "today", Title: "Today", Options: todaySection},
			{ID: "state", Title: "Card State", Options: stateSection},
			{ID: "tag", Title: "Tags", Options: tagSection},
		},
	}, nil
}

func (s *Service) Browse(ctx context.Context, userID uuid.UUID, q BrowseQuery) ([]Card, error) {
	now := time.Now().UTC()
	dayStart := startOfDayUTC(now)

	params := db.BrowseUserCardsParams{UserID: userID}

	switch q.FilterType {
	case "", "all":
		// no extra filters
	case "state":
		if q.FilterValue != "" {
			params.State = &q.FilterValue
		}
	case "deck":
		if q.FilterValue != "" {
			id, err := uuid.Parse(q.FilterValue)
			if err != nil {
				return nil, err
			}
			params.DeckID = &id
		}
	case "today":
		switch q.FilterValue {
		case "due":
			params.DueBefore = &now
		case "added":
			params.CreatedAfter = &dayStart
		case "edited":
			params.EditedAfter = &dayStart
		}
	case "tag":
		if q.FilterValue == "untagged" {
			untagged := true
			params.UntaggedOnly = &untagged
		}
	}

	rows, err := s.q.BrowseUserCards(ctx, params)
	if err != nil {
		return nil, err
	}

	out := make([]Card, 0, len(rows))
	for _, row := range rows {
		out = append(out, mapCard(row))
	}
	return out, nil
}
