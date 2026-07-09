package cards

import (
	"context"
	"net/http"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type cardsServicer interface {
	Create(ctx context.Context, in CreateInput) (Card, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (Card, error)
	ListByDeck(ctx context.Context, deckID, userID uuid.UUID) ([]Card, error)
	CountByDeck(ctx context.Context, deckID, userID uuid.UUID) (int64, error)
	ListDueByUser(ctx context.Context, userID uuid.UUID, limit, offset int32) ([]Card, int64, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Card, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
	Move(ctx context.Context, id, newDeckID, userID uuid.UUID) (Card, error)
	SubmitReview(ctx context.Context, in ReviewInput) (ReviewOutput, error)
	DueSummaryByDeck(ctx context.Context, deckID, userID uuid.UUID, limit, offset int32) (DueSummary, error)
	BrowseFilters(ctx context.Context, userID uuid.UUID) (BrowseFilters, error)
	Browse(ctx context.Context, userID uuid.UUID, q BrowseQuery) ([]Card, error)
	PreviewReview(ctx context.Context, id, userID uuid.UUID) (ReviewPreview, error)
	FSRSDebug(ctx context.Context, id, userID uuid.UUID) (FSRSDebugResult, error)
	GetAudio(ctx context.Context, cardID, userID uuid.UUID) (string, error)
	SynthesizeText(ctx context.Context, text string) (string, error)
	BulkCreate(ctx context.Context, in BulkCreateInput) (BulkCreateOutput, error)
}

type Handler struct {
	svc cardsServicer
	jwt *auth.JWTManager
}

func NewHandler(svc *Service, jwt *auth.JWTManager) *Handler {
	return &Handler{svc: svc, jwt: jwt}
}

func newHandlerWithService(svc cardsServicer, jwt *auth.JWTManager) *Handler {
	return &Handler{svc: svc, jwt: jwt}
}

// RegisterCardRoutes wires the card endpoints. synthesizeMiddleware (e.g. a
// per-user rate limiter) is applied only to POST /audio, which triggers a
// paid call to the TTS provider on cache miss and is otherwise unbounded per
// user (see cogcs#37).
func (h *Handler) RegisterCardRoutes(g *gin.RouterGroup, synthesizeMiddleware ...gin.HandlerFunc) {
	g.Use(auth.Middleware(h.jwt))
	g.POST("", h.create)
	g.POST("/", h.create)
	g.POST("/bulk", h.bulkCreate)
	g.GET("/browse/filters", h.browseFilters)
	g.GET("/browse", h.browse)
	g.GET("/due", h.listDue)
	g.GET("/deck/:id/due-summary", h.dueSummary)
	g.GET("/deck/:id/export", h.exportDeck)
	g.GET("/:id", h.get)
	g.GET("/:id/fsrs-debug", h.fsrsDebug)
	g.GET("/:id/preview", h.preview)
	g.GET("/:id/front", h.getFront)
	g.GET("/:id/back", h.getBack)
	g.GET("/:id/audio", h.audio)
	g.POST("/audio", append(synthesizeMiddleware, h.synthesizeText)...)
	g.PUT("/:id", h.update)
	g.PATCH("/:id/move", h.move)
	g.DELETE("/:id", h.delete)
	g.POST("/:id/review", h.review)
}

func (h *Handler) RegisterDeckCardRoutes(g *gin.RouterGroup) {
	g.Use(auth.Middleware(h.jwt))
	g.GET("/:id/cards", h.listByDeck)
	g.GET("/:id/cards/count", h.countByDeck)
}

type cardResp struct {
	ID         string  `json:"id"`
	DeckID     string  `json:"deckId"`
	Front      string  `json:"front"`
	Back       string  `json:"back"`
	AudioURL   string  `json:"audioUrl,omitempty"`
	ImagemURL  string  `json:"imagemUrl,omitempty"`
	Phonetic   string  `json:"phonetic,omitempty"`
	TTSEnabled bool    `json:"ttsEnabled"`
	State      string  `json:"state"`
	Stability  float64 `json:"stability"`
	Difficulty float64 `json:"difficulty"`
	Due        string  `json:"due"`
	LastReview string  `json:"lastReview,omitempty"`
	Reps       int32   `json:"reps"`
	Lapses     int32   `json:"lapses"`
	CreatedAt  string  `json:"createdAt"`
	UpdatedAt  string  `json:"updatedAt"`
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	card, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(card))
}

func (h *Handler) listByDeck(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	deckID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	cards, err := h.svc.ListByDeck(c.Request.Context(), deckID, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]cardResp, 0, len(cards))
	for _, card := range cards {
		out = append(out, toResp(card))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) countByDeck(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	deckID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	count, err := h.svc.CountByDeck(c.Request.Context(), deckID, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func toResp(card Card) cardResp {
	audio := ""
	if card.AudioURL != nil {
		audio = *card.AudioURL
	}
	img := ""
	if card.ImagemURL != nil {
		img = *card.ImagemURL
	}
	fon := ""
	if card.Phonetic != nil {
		fon = *card.Phonetic
	}
	last := ""
	if card.LastReview != nil {
		last = card.LastReview.Format(time.RFC3339)
	}
	return cardResp{
		ID: card.ID.String(), DeckID: card.DeckID.String(),
		Front: card.Front, Back: card.Back,
		AudioURL: audio, ImagemURL: img, Phonetic: fon,
		TTSEnabled: card.TTSEnabled,
		State:      card.State, Stability: card.Stability, Difficulty: card.Difficulty,
		Due: card.Due.Format(time.RFC3339), LastReview: last,
		Reps: card.Reps, Lapses: card.Lapses,
		CreatedAt: card.CreatedAt.Format(time.RFC3339),
		UpdatedAt: card.UpdatedAt.Format(time.RFC3339),
	}
}
