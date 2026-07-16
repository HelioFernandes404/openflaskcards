package studyplans

import (
	"context"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"github.com/google/uuid"
)

type studyPlanServicer interface {
	Create(ctx context.Context, in CreateInput) (StudyPlan, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]StudyPlan, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (StudyPlan, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (StudyPlan, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
	GetProgress(ctx context.Context, id, userID uuid.UUID) (ProgressRecord, error)
	SaveProgress(ctx context.Context, id, userID uuid.UUID, in ProgressRecord) (ProgressRecord, error)
}

type Handler struct {
	svc studyPlanServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc studyPlanServicer) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(g *gin.RouterGroup) {
	g.Use(auth.Middleware())
	g.POST("", h.create)
	g.POST("/", h.create)
	g.GET("", h.list)
	g.GET("/", h.list)
	g.GET("/:id/progress", h.getProgress)
	g.PUT("/:id/progress", h.saveProgress)
	g.GET("/:id", h.get)
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)
}

type stepDTO struct {
	Order    int    `json:"order"`
	Activity string `json:"activity"`
	Duration string `json:"duration"`
	Notes    string `json:"notes"`
}

type progressDTO struct {
	Sessions      map[string][]int `json:"sessions"`
	TotalXp       int              `json:"totalXp"`
	LongestStreak int              `json:"longestStreak"`
}

type studyPlanResp struct {
	ID              string      `json:"id"`
	UserID          string      `json:"userId"`
	Title           string      `json:"title"`
	Level           string      `json:"level"`
	Goal            string      `json:"goal"`
	GoldenRule      string      `json:"goldenRule"`
	Flexibility     string      `json:"flexibility"`
	NoFixedDeadline bool        `json:"noFixedDeadline"`
	Steps           []stepDTO   `json:"steps"`
	Progress        progressDTO `json:"progress"`
	CreatedAt       string      `json:"createdAt"`
	UpdatedAt       string      `json:"updatedAt"`
}

type createReq struct {
	Title           string    `json:"title" binding:"required,min=1,max=255"`
	Level           string    `json:"level"`
	Goal            string    `json:"goal"`
	GoldenRule      string    `json:"goldenRule"`
	Flexibility     string    `json:"flexibility"`
	NoFixedDeadline *bool     `json:"noFixedDeadline"`
	Steps           []stepDTO `json:"steps"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	noFixedDeadline := true
	if req.NoFixedDeadline != nil {
		noFixedDeadline = *req.NoFixedDeadline
	}
	plan, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID:          uid,
		Title:           req.Title,
		Level:           req.Level,
		Goal:            req.Goal,
		GoldenRule:      req.GoldenRule,
		Flexibility:     req.Flexibility,
		NoFixedDeadline: noFixedDeadline,
		Steps:           toServiceSteps(req.Steps),
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(plan))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	plans, err := h.svc.ListByUser(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]studyPlanResp, 0, len(plans))
	for _, p := range plans {
		out = append(out, toResp(p))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrStudyPlanNotFound)
		return
	}
	p, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(p))
}

type updateReq struct {
	Title           *string   `json:"title"`
	Level           *string   `json:"level"`
	Goal            *string   `json:"goal"`
	GoldenRule      *string   `json:"goldenRule"`
	Flexibility     *string   `json:"flexibility"`
	NoFixedDeadline *bool     `json:"noFixedDeadline"`
	Steps           []stepDTO `json:"steps"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrStudyPlanNotFound)
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
	_, stepsProvided := rawBody["steps"]
	p, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Title:           req.Title,
		Level:           req.Level,
		Goal:            req.Goal,
		GoldenRule:      req.GoldenRule,
		Flexibility:     req.Flexibility,
		NoFixedDeadline: req.NoFixedDeadline,
		Steps:           toServiceSteps(req.Steps),
		StepsProvided:   stepsProvided,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(p))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrStudyPlanNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) getProgress(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrStudyPlanNotFound)
		return
	}
	progress, err := h.svc.GetProgress(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toProgressResp(progress))
}

func (h *Handler) saveProgress(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrStudyPlanNotFound)
		return
	}
	var req progressDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	progress, err := h.svc.SaveProgress(c.Request.Context(), id, uid, ProgressRecord{
		Sessions:      req.Sessions,
		TotalXp:       req.TotalXp,
		LongestStreak: req.LongestStreak,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toProgressResp(progress))
}

func toServiceSteps(steps []stepDTO) []Step {
	out := make([]Step, 0, len(steps))
	for _, s := range steps {
		out = append(out, Step{Order: s.Order, Activity: s.Activity, Duration: s.Duration, Notes: s.Notes})
	}
	return out
}

func toProgressResp(p ProgressRecord) progressDTO {
	sessions := p.Sessions
	if sessions == nil {
		sessions = map[string][]int{}
	}
	return progressDTO{
		Sessions:      sessions,
		TotalXp:       p.TotalXp,
		LongestStreak: p.LongestStreak,
	}
}

func toResp(p StudyPlan) studyPlanResp {
	steps := make([]stepDTO, 0, len(p.Steps))
	for _, s := range p.Steps {
		steps = append(steps, stepDTO{Order: s.Order, Activity: s.Activity, Duration: s.Duration, Notes: s.Notes})
	}
	return studyPlanResp{
		ID: p.ID.String(), UserID: p.UserID.String(), Title: p.Title, Level: p.Level, Goal: p.Goal,
		GoldenRule: p.GoldenRule, Flexibility: p.Flexibility, NoFixedDeadline: p.NoFixedDeadline,
		Steps: steps, Progress: toProgressResp(p.Progress),
		CreatedAt: p.CreatedAt, UpdatedAt: p.UpdatedAt,
	}
}
