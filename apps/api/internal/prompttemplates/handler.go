package prompttemplates

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type promptTemplateServicer interface {
	Create(ctx context.Context, in CreateInput) (PromptTemplate, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]PromptTemplate, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (PromptTemplate, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (PromptTemplate, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

type Handler struct {
	svc promptTemplateServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc promptTemplateServicer) *Handler {
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

type PromptTemplate struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Name      string
	Body      string
	CreatedAt string
	UpdatedAt string
}

type CreateInput struct {
	UserID uuid.UUID
	Name   string
	Body   string
}

type UpdateInput struct {
	Name *string
	Body *string
}

type templateResp struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	Name      string `json:"name"`
	Body      string `json:"body"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type createReq struct {
	Name string `json:"name" binding:"required,min=1,max=255"`
	Body string `json:"body" binding:"required"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	t, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID: uid,
		Name:   req.Name,
		Body:   req.Body,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(t))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	templates, err := h.svc.ListByUser(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]templateResp, 0, len(templates))
	for _, t := range templates {
		out = append(out, toResp(t))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrPromptTemplateNotFound)
		return
	}
	t, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(t))
}

type updateReq struct {
	Name *string `json:"name"`
	Body *string `json:"body"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrPromptTemplateNotFound)
		return
	}
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	t, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Name: req.Name,
		Body: req.Body,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(t))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrPromptTemplateNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func toResp(t PromptTemplate) templateResp {
	return templateResp{
		ID:        t.ID.String(),
		UserID:    t.UserID.String(),
		Name:      t.Name,
		Body:      t.Body,
		CreatedAt: t.CreatedAt,
		UpdatedAt: t.UpdatedAt,
	}
}
