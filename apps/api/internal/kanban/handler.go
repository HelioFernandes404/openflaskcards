package kanban

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/pagination"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type kanbanServicer interface {
	Create(ctx context.Context, in CreateInput) (KanbanCard, error)
	ListByUser(ctx context.Context, userID uuid.UUID, status *string, page pagination.Params) ([]KanbanCard, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (KanbanCard, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (KanbanCard, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
	PullNext(ctx context.Context, userID uuid.UUID, assignee string) (KanbanCard, error)
}

type Handler struct {
	svc kanbanServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc kanbanServicer) *Handler {
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
	g.POST("/pull-next", h.pullNext)
}

type kanbanCardResp struct {
	ID               string  `json:"id"`
	UserID           string  `json:"userId"`
	Title            string  `json:"title"`
	Description      string  `json:"description"`
	Status           string  `json:"status"`
	Priority         string  `json:"priority"`
	Assignee         *string `json:"assignee"`
	Position         int32   `json:"position"`
	Type             string  `json:"type"`
	VerificationNote string  `json:"verificationNote"`
	CreatedAt        string  `json:"createdAt"`
	UpdatedAt        string  `json:"updatedAt"`
}

type createReq struct {
	Title       string  `json:"title" binding:"required,min=1,max=255"`
	Description string  `json:"description"`
	Status      string  `json:"status" binding:"omitempty,oneof=backlog todo in_progress done"`
	Priority    string  `json:"priority" binding:"omitempty,oneof=low medium high"`
	Assignee    *string `json:"assignee" binding:"omitempty,oneof=human claude_code"`
	Type        string  `json:"type" binding:"omitempty,oneof=bug feature tech_debt chore"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	card, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID:      uid,
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		Assignee:    req.Assignee,
		Type:        req.Type,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(card))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var status *string
	if q := c.Query("status"); q != "" {
		status = &q
	}
	page := pagination.Parse(c.Query("page"), c.Query("pageSize"))
	cards, err := h.svc.ListByUser(c.Request.Context(), uid, status, page)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]kanbanCardResp, 0, len(cards))
	for _, card := range cards {
		out = append(out, toResp(card))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrKanbanCardNotFound)
		return
	}
	card, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(card))
}

type updateReq struct {
	Title            *string `json:"title"`
	Description      *string `json:"description"`
	Status           *string `json:"status" binding:"omitempty,oneof=backlog todo in_progress done"`
	Priority         *string `json:"priority" binding:"omitempty,oneof=low medium high"`
	Assignee         *string `json:"assignee" binding:"omitempty,oneof=human claude_code"`
	Type             *string `json:"type" binding:"omitempty,oneof=bug feature tech_debt chore"`
	VerificationNote *string `json:"verificationNote"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrKanbanCardNotFound)
		return
	}
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	card, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Title:            req.Title,
		Description:      req.Description,
		Status:           req.Status,
		Priority:         req.Priority,
		Assignee:         req.Assignee,
		Type:             req.Type,
		VerificationNote: req.VerificationNote,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(card))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrKanbanCardNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type pullNextReq struct {
	Assignee string `json:"assignee" binding:"omitempty,oneof=human claude_code"`
}

func (h *Handler) pullNext(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req pullNextReq
	if c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
			return
		}
	}
	assignee := req.Assignee
	if assignee == "" {
		assignee = "claude_code"
	}
	card, err := h.svc.PullNext(c.Request.Context(), uid, assignee)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(card))
}

func toResp(card KanbanCard) kanbanCardResp {
	return kanbanCardResp{
		ID:               card.ID.String(),
		UserID:           card.UserID.String(),
		Title:            card.Title,
		Description:      card.Description,
		Status:           card.Status,
		Priority:         card.Priority,
		Assignee:         card.Assignee,
		Position:         card.Position,
		Type:             card.Type,
		VerificationNote: card.VerificationNote,
		CreatedAt:        card.CreatedAt,
		UpdatedAt:        card.UpdatedAt,
	}
}
