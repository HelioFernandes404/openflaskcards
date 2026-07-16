package letters

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/google/uuid"
)

type letterServicer interface {
	Create(ctx context.Context, in CreateInput) (Letter, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Letter, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (Letter, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Letter, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

type Handler struct {
	svc letterServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc letterServicer) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(g *gin.RouterGroup) {
	g.Use(auth.Middleware())
	g.POST("", h.create)
	g.POST("/", h.create)
	g.GET("", h.list)
	g.GET("/", h.list)
	g.GET("/:id", h.get)
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)
}

type letterResp struct {
	ID             string  `json:"id"`
	UserID         string  `json:"userId"`
	Title          string  `json:"title"`
	Artist         string  `json:"artist"`
	OriginalLyrics string  `json:"originalLyrics"`
	Translation    string  `json:"translation"`
	DeckID         *string `json:"deckId"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}

type createReq struct {
	Title          string  `json:"title" binding:"required,min=1,max=255"`
	Artist         string  `json:"artist" binding:"max=255"`
	OriginalLyrics string  `json:"originalLyrics"`
	Translation    string  `json:"translation"`
	DeckID         *string `json:"deckId"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	deckID, err := parseDeckID(req.DeckID)
	if err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, "invalid deckId"))
		return
	}
	letter, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID:         uid,
		Title:          req.Title,
		Artist:         req.Artist,
		OriginalLyrics: req.OriginalLyrics,
		Translation:    req.Translation,
		DeckID:         deckID,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(letter))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	letters, err := h.svc.ListByUser(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]letterResp, 0, len(letters))
	for _, letter := range letters {
		out = append(out, toResp(letter))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrLetterNotFound)
		return
	}
	letter, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(letter))
}

type updateReq struct {
	Title          *string `json:"title"`
	Artist         *string `json:"artist"`
	OriginalLyrics *string `json:"originalLyrics"`
	Translation    *string `json:"translation"`
	DeckID         *string `json:"deckId"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrLetterNotFound)
		return
	}
	var rawBody map[string]interface{}
	if err := c.ShouldBindBodyWith(&rawBody, binding.JSON); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	_, deckIDProvided := rawBody["deckId"]
	var deckID *uuid.UUID
	if deckIDProvided {
		deckID, err = parseDeckID(req.DeckID)
		if err != nil {
			auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, "invalid deckId"))
			return
		}
	}
	letter, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Title:          req.Title,
		Artist:         req.Artist,
		OriginalLyrics: req.OriginalLyrics,
		Translation:    req.Translation,
		DeckID:         deckID,
		DeckIDSet:      deckIDProvided,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(letter))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrLetterNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func parseDeckID(raw *string) (*uuid.UUID, error) {
	if raw == nil || *raw == "" {
		return nil, nil
	}
	id, err := uuid.Parse(*raw)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func toResp(letter Letter) letterResp {
	var deckID *string
	if letter.DeckID != nil {
		s := letter.DeckID.String()
		deckID = &s
	}
	return letterResp{
		ID:             letter.ID.String(),
		UserID:         letter.UserID.String(),
		Title:          letter.Title,
		Artist:         letter.Artist,
		OriginalLyrics: letter.OriginalLyrics,
		Translation:    letter.Translation,
		DeckID:         deckID,
		CreatedAt:      letter.CreatedAt,
		UpdatedAt:      letter.UpdatedAt,
	}
}
