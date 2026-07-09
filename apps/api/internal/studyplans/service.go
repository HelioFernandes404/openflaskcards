package studyplans

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	q *db.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{q: db.New(pool)}
}

type Step struct {
	Order    int    `json:"order"`
	Activity string `json:"activity"`
	Duration string `json:"duration"`
	Notes    string `json:"notes"`
}

type ProgressRecord struct {
	Sessions      map[string][]int `json:"sessions"`
	TotalXp       int              `json:"totalXp"`
	LongestStreak int              `json:"longestStreak"`
}

type StudyPlan struct {
	ID              uuid.UUID
	UserID          uuid.UUID
	Title           string
	Level           string
	Goal            string
	GoldenRule      string
	Flexibility     string
	NoFixedDeadline bool
	Steps           []Step
	Progress        ProgressRecord
	CreatedAt       string
	UpdatedAt       string
}

type CreateInput struct {
	UserID          uuid.UUID
	Title           string
	Level           string
	Goal            string
	GoldenRule      string
	Flexibility     string
	NoFixedDeadline bool
	Steps           []Step
}

type UpdateInput struct {
	Title           *string
	Level           *string
	Goal            *string
	GoldenRule      *string
	Flexibility     *string
	NoFixedDeadline *bool
	Steps           []Step
	StepsProvided   bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (StudyPlan, error) {
	stepsJSON, err := marshalSteps(in.Steps)
	if err != nil {
		return StudyPlan{}, apperror.New("VALIDATION_ERROR", 422, "invalid steps")
	}
	row, err := s.q.CreateStudyPlan(ctx, db.CreateStudyPlanParams{
		UserID:          in.UserID,
		Title:           in.Title,
		Level:           in.Level,
		Goal:            in.Goal,
		GoldenRule:      in.GoldenRule,
		Flexibility:     in.Flexibility,
		NoFixedDeadline: in.NoFixedDeadline,
		Steps:           stepsJSON,
	})
	if err != nil {
		return StudyPlan{}, err
	}
	return mapStudyPlan(row)
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]StudyPlan, error) {
	rows, err := s.q.ListStudyPlansByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]StudyPlan, 0, len(rows))
	for _, r := range rows {
		p, err := mapStudyPlan(r)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (StudyPlan, error) {
	row, err := s.q.GetStudyPlanByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return StudyPlan{}, apperror.ErrStudyPlanNotFound
		}
		return StudyPlan{}, err
	}
	if row.UserID != userID {
		return StudyPlan{}, apperror.ErrForbidden
	}
	return mapStudyPlan(row)
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (StudyPlan, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return StudyPlan{}, err
	}
	var stepsJSON []byte
	if in.StepsProvided {
		j, err := marshalSteps(in.Steps)
		if err != nil {
			return StudyPlan{}, apperror.New("VALIDATION_ERROR", 422, "invalid steps")
		}
		stepsJSON = j
	}
	row, err := s.q.UpdateStudyPlan(ctx, db.UpdateStudyPlanParams{
		ID:              id,
		Title:           in.Title,
		Level:           in.Level,
		Goal:            in.Goal,
		GoldenRule:      in.GoldenRule,
		Flexibility:     in.Flexibility,
		NoFixedDeadline: in.NoFixedDeadline,
		Steps:           stepsJSON,
	})
	if err != nil {
		return StudyPlan{}, err
	}
	return mapStudyPlan(row)
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteStudyPlan(ctx, id)
}

func (s *Service) GetProgress(ctx context.Context, id, userID uuid.UUID) (ProgressRecord, error) {
	plan, err := s.GetByID(ctx, id, userID)
	if err != nil {
		return ProgressRecord{}, err
	}
	return plan.Progress, nil
}

// maxXpPerSave and maxStreakIncrementPerSave bound how much a single
// SaveProgress call may move totalXp/longestStreak forward. The client
// payload is never trusted as authoritative: values are clamped relative
// to the previously persisted state so a single request can't arbitrarily
// inflate gamification metrics.
const (
	maxXpPerSave              = 1000
	maxStreakIncrementPerSave = 1
)

func (s *Service) SaveProgress(ctx context.Context, id, userID uuid.UUID, in ProgressRecord) (ProgressRecord, error) {
	plan, err := s.GetByID(ctx, id, userID)
	if err != nil {
		return ProgressRecord{}, err
	}
	in = clampProgress(plan.Progress, in)
	progressJSON, err := marshalProgress(in)
	if err != nil {
		return ProgressRecord{}, apperror.New("VALIDATION_ERROR", 422, "invalid progress")
	}
	row, err := s.q.UpdateStudyPlanProgress(ctx, db.UpdateStudyPlanProgressParams{
		ID:       id,
		Progress: progressJSON,
	})
	if err != nil {
		return ProgressRecord{}, err
	}
	return mapProgress(row.Progress)
}

// clampProgress bounds the client-supplied progress values against the
// previously persisted state: totalXp/longestStreak may never regress, and
// may never move forward by more than a plausible amount in one call.
func clampProgress(prev, in ProgressRecord) ProgressRecord {
	if in.TotalXp < prev.TotalXp {
		in.TotalXp = prev.TotalXp
	} else if in.TotalXp > prev.TotalXp+maxXpPerSave {
		in.TotalXp = prev.TotalXp + maxXpPerSave
	}

	if in.LongestStreak < prev.LongestStreak {
		in.LongestStreak = prev.LongestStreak
	} else if in.LongestStreak > prev.LongestStreak+maxStreakIncrementPerSave {
		in.LongestStreak = prev.LongestStreak + maxStreakIncrementPerSave
	}

	return in
}

func marshalSteps(steps []Step) ([]byte, error) {
	if steps == nil {
		steps = []Step{}
	}
	return json.Marshal(steps)
}

func emptyProgressRecord() ProgressRecord {
	return ProgressRecord{Sessions: map[string][]int{}, TotalXp: 0, LongestStreak: 0}
}

func marshalProgress(record ProgressRecord) ([]byte, error) {
	if record.Sessions == nil {
		record.Sessions = map[string][]int{}
	}
	return json.Marshal(record)
}

func mapProgress(raw []byte) (ProgressRecord, error) {
	if len(raw) == 0 {
		return emptyProgressRecord(), nil
	}
	var record ProgressRecord
	if err := json.Unmarshal(raw, &record); err != nil {
		return ProgressRecord{}, err
	}
	if record.Sessions == nil {
		record.Sessions = map[string][]int{}
	}
	return record, nil
}

func mapStudyPlan(row db.StudyPlan) (StudyPlan, error) {
	var steps []Step
	if len(row.Steps) > 0 {
		if err := json.Unmarshal(row.Steps, &steps); err != nil {
			return StudyPlan{}, err
		}
	}
	progress, err := mapProgress(row.Progress)
	if err != nil {
		return StudyPlan{}, err
	}
	return StudyPlan{
		ID:              row.ID,
		UserID:          row.UserID,
		Title:           row.Title,
		Level:           row.Level,
		Goal:            row.Goal,
		GoldenRule:      row.GoldenRule,
		Flexibility:     row.Flexibility,
		NoFixedDeadline: row.NoFixedDeadline,
		Steps:           steps,
		Progress:        progress,
		CreatedAt:       row.CreatedAt.Format(time.RFC3339),
		UpdatedAt:       row.UpdatedAt.Format(time.RFC3339),
	}, nil
}
