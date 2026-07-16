package notes

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/pagination"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type noteServicer interface {
	Create(ctx context.Context, in CreateInput) (Note, error)
	ListByUser(ctx context.Context, userID uuid.UUID, page pagination.Params) ([]Note, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (Note, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Note, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
}

type Handler struct {
	svc noteServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc noteServicer) *Handler {
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

type noteResp struct {
	ID        string `json:"id"`
	UserID    string `json:"userId"`
	Title     string `json:"title"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

type createReq struct {
	Title   string `json:"title" binding:"required,min=1,max=255"`
	Content string `json:"content"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	note, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID: uid, Title: req.Title, Content: req.Content,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(note))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	page := pagination.Parse(c.Query("page"), c.Query("pageSize"))
	notes, err := h.svc.ListByUser(c.Request.Context(), uid, page)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]noteResp, 0, len(notes))
	for _, n := range notes {
		out = append(out, toResp(n))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrNoteNotFound)
		return
	}
	n, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(n))
}

type updateReq struct {
	Title   *string `json:"title"`
	Content *string `json:"content"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrNoteNotFound)
		return
	}
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	n, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Title: req.Title, Content: req.Content,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(n))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrNoteNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func toResp(n Note) noteResp {
	return noteResp{
		ID: n.ID.String(), UserID: n.UserID.String(), Title: n.Title, Content: n.Content,
		CreatedAt: n.CreatedAt, UpdatedAt: n.UpdatedAt,
	}
}
