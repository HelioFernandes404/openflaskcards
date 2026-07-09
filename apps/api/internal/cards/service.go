package cards

import (
	"context"
	"errors"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	db "github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/db/sqlc"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/fsrs"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/tts"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

// mediaOwnerChecker resolves a media URL (as issued by the media package,
// e.g. "/api/v1/media/<id>") back to its owner, so cards can reject
// audioUrl/imagemUrl values that don't belong to the requesting user. ok is
// false when the URL isn't a valid/existing media reference.
type mediaOwnerChecker interface {
	OwnerOfURL(ctx context.Context, url string) (userID uuid.UUID, ok bool, err error)
}

type Service struct {
	pool  *pgxpool.Pool
	q     *db.Queries
	fsrs  *fsrs.Scheduler
	tts   *tts.Service
	log   *zap.Logger
	media mediaOwnerChecker
}

func NewService(pool *pgxpool.Pool, scheduler *fsrs.Scheduler, ttsSvc *tts.Service, opts ...ServiceOption) *Service {
	s := &Service{pool: pool, q: db.New(pool), fsrs: scheduler, tts: ttsSvc, log: zap.NewNop()}
	for _, opt := range opts {
		opt(s)
	}
	return s
}

type ServiceOption func(*Service)

// WithLogger overrides the no-op default logger, e.g. to surface silent
// FSRS scheduler fallbacks in production logs.
func WithLogger(log *zap.Logger) ServiceOption {
	return func(s *Service) { s.log = log }
}

// WithMediaOwnerChecker wires in ownership validation for audioUrl/imagemUrl
// on Create/Update. Without it (e.g. in tests), those fields are accepted
// unchecked.
func WithMediaOwnerChecker(m mediaOwnerChecker) ServiceOption {
	return func(s *Service) { s.media = m }
}

// validateMediaOwnership rejects a client-submitted audioUrl/imagemUrl that
// doesn't resolve to media owned by userID. This closes the gap where a
// user could point a card at another user's media URL, which the global
// (not owner-scoped) "media in use" check on delete would then treat as a
// permanent block on the true owner deleting their own media.
func (s *Service) validateMediaOwnership(ctx context.Context, userID uuid.UUID, url *string) error {
	if url == nil || s.media == nil {
		return nil
	}
	ownerID, ok, err := s.media.OwnerOfURL(ctx, *url)
	if err != nil {
		return err
	}
	if !ok || ownerID != userID {
		return apperror.ErrMediaNotFound
	}
	return nil
}

type CreateInput struct {
	DeckID     uuid.UUID
	UserID     uuid.UUID
	Front      string
	Back       string
	AudioURL   *string
	ImagemURL  *string
	Phonetic   *string
	TTSEnabled bool
}

func (s *Service) Create(ctx context.Context, in CreateInput) (Card, error) {
	deck, err := s.q.GetDeckByID(ctx, in.DeckID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Card{}, apperror.ErrDeckNotFound
		}
		return Card{}, err
	}
	if deck.UserID != in.UserID {
		return Card{}, apperror.ErrDeckNotFound
	}
	if err := s.validateMediaOwnership(ctx, in.UserID, in.AudioURL); err != nil {
		return Card{}, err
	}
	if err := s.validateMediaOwnership(ctx, in.UserID, in.ImagemURL); err != nil {
		return Card{}, err
	}
	newCard := s.fsrs.NewCard()
	cardJSON, err := s.fsrs.MarshalCard(newCard)
	if err != nil {
		return Card{}, err
	}
	js := string(cardJSON)
	row, err := s.q.CreateCard(ctx, db.CreateCardParams{
		DeckID:       in.DeckID,
		Front:        in.Front,
		Back:         in.Back,
		AudioUrl:     in.AudioURL,
		ImagemUrl:    in.ImagemURL,
		Fonetica:     in.Phonetic,
		TtsEnabled:   in.TTSEnabled,
		State:        "new",
		Stability:    newCard.Stability,
		Difficulty:   newCard.Difficulty,
		Due:          newCard.Due,
		FsrsCardJson: &js,
	})
	if err != nil {
		return Card{}, err
	}
	return mapCard(row), nil
}

func (s *Service) GetByID(ctx context.Context, id, userID uuid.UUID) (Card, error) {
	row, err := s.q.GetCardByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Card{}, apperror.ErrCardNotFound
		}
		return Card{}, err
	}
	deck, err := s.q.GetDeckByID(ctx, row.DeckID)
	if err != nil {
		return Card{}, apperror.ErrCardNotFound
	}
	if deck.UserID != userID {
		return Card{}, apperror.ErrCardNotFound
	}
	return mapCard(row), nil
}

func (s *Service) ListByDeck(ctx context.Context, deckID, userID uuid.UUID) ([]Card, error) {
	deck, err := s.q.GetDeckByID(ctx, deckID)
	if err != nil {
		return nil, apperror.ErrDeckNotFound
	}
	if deck.UserID != userID {
		return nil, apperror.ErrDeckNotFound
	}
	rows, err := s.q.ListCardsByDeck(ctx, deckID)
	if err != nil {
		return nil, err
	}
	out := make([]Card, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapCard(r))
	}
	return out, nil
}

func (s *Service) CountByDeck(ctx context.Context, deckID, userID uuid.UUID) (int64, error) {
	deck, err := s.q.GetDeckByID(ctx, deckID)
	if err != nil {
		return 0, apperror.ErrDeckNotFound
	}
	if deck.UserID != userID {
		return 0, apperror.ErrDeckNotFound
	}
	return s.q.CountCardsByDeck(ctx, deckID)
}

func (s *Service) ListDueByUser(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]Card, int64, error) {
	if limit <= 0 {
		limit = 50
	}
	now := time.Now().UTC()
	rows, err := s.q.ListDueCardsByUser(ctx, db.ListDueCardsByUserParams{
		UserID: userID, Due: now, Limit: limit, Offset: offset,
	})
	if err != nil {
		return nil, 0, err
	}
	total, err := s.q.CountUserCardsDueBy(ctx, db.CountUserCardsDueByParams{
		UserID: userID, Due: now,
	})
	if err != nil {
		return nil, 0, err
	}
	out := make([]Card, 0, len(rows))
	for _, r := range rows {
		out = append(out, mapCard(r))
	}
	return out, total, nil
}

type UpdateInput struct {
	Front      *string
	Back       *string
	AudioURL   *string
	ImagemURL  *string
	Phonetic   *string
	TTSEnabled *bool
}

func (s *Service) Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Card, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return Card{}, err
	}
	if err := s.validateMediaOwnership(ctx, userID, in.AudioURL); err != nil {
		return Card{}, err
	}
	if err := s.validateMediaOwnership(ctx, userID, in.ImagemURL); err != nil {
		return Card{}, err
	}
	row, err := s.q.UpdateCard(ctx, db.UpdateCardParams{
		ID:         id,
		UserID:     userID,
		Front:      in.Front,
		Back:       in.Back,
		AudioUrl:   in.AudioURL,
		ImagemUrl:  in.ImagemURL,
		Fonetica:   in.Phonetic,
		TtsEnabled: in.TTSEnabled,
	})
	if err != nil {
		return Card{}, err
	}
	return mapCard(row), nil
}

func (s *Service) Delete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return err
	}
	return s.q.DeleteCard(ctx, db.DeleteCardParams{ID: id, UserID: userID})
}

func (s *Service) Move(ctx context.Context, id, newDeckID, userID uuid.UUID) (Card, error) {
	if _, err := s.GetByID(ctx, id, userID); err != nil {
		return Card{}, err
	}
	newDeck, err := s.q.GetDeckByID(ctx, newDeckID)
	if err != nil || newDeck.UserID != userID {
		return Card{}, apperror.ErrDeckNotFound
	}
	row, err := s.q.MoveCard(ctx, db.MoveCardParams{ID: id, DeckID: newDeckID})
	if err != nil {
		return Card{}, err
	}
	return mapCard(row), nil
}
