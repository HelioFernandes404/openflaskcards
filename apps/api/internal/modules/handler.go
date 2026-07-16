package modules

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type moduleServicer interface {
	Create(ctx context.Context, in CreateInput) (Module, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Module, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (Module, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Module, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

type Handler struct {
	svc moduleServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc moduleServicer) *Handler {
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

type moduleResp struct {
	ID                 string `json:"id"`
	UserID             string `json:"userId"`
	Name               string `json:"name"`
	Description        string `json:"description,omitempty"`
	SortOrder          int32  `json:"sortOrder"`
	PromptModuleTypeID string `json:"promptModuleTypeId"`
	CreatedAt          string `json:"createdAt"`
	UpdatedAt          string `json:"updatedAt"`
}

type createReq struct {
	Name               string  `json:"name" binding:"required,min=1,max=255"`
	Description        *string `json:"description"`
	SortOrder          int32   `json:"sortOrder"`
	PromptModuleTypeID *string `json:"promptModuleTypeId"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	mod, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID: uid, Name: req.Name, Description: req.Description, SortOrder: req.SortOrder,
		PromptModuleTypeID: req.PromptModuleTypeID,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(mod))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	mods, err := h.svc.ListByUser(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]moduleResp, 0, len(mods))
	for _, m := range mods {
		out = append(out, toResp(m))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrModuleNotFound)
		return
	}
	mod, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(mod))
}

type updateReq struct {
	Name               *string `json:"name"`
	Description        *string `json:"description"`
	SortOrder          *int32  `json:"sortOrder"`
	PromptModuleTypeID *string `json:"promptModuleTypeId"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrModuleNotFound)
		return
	}
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	mod, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Name: req.Name, Description: req.Description, SortOrder: req.SortOrder,
		PromptModuleTypeID: req.PromptModuleTypeID,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(mod))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrModuleNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func toResp(m Module) moduleResp {
	desc := ""
	if m.Description != nil {
		desc = *m.Description
	}
	return moduleResp{
		ID: m.ID.String(), UserID: m.UserID.String(), Name: m.Name,
		Description: desc, SortOrder: m.SortOrder, PromptModuleTypeID: m.PromptModuleTypeID,
		CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}
