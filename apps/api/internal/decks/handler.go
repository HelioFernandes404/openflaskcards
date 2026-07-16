package decks

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/pagination"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type decksServicer interface {
	Create(ctx context.Context, in CreateInput) (Deck, error)
	ListByUser(ctx context.Context, userID uuid.UUID, page pagination.Params) ([]Deck, error)
	GetByID(ctx context.Context, id, userID uuid.UUID) (Deck, error)
	Update(ctx context.Context, id, userID uuid.UUID, in UpdateInput) (Deck, error)
	Delete(ctx context.Context, id, userID uuid.UUID) error
	StatsByUser(ctx context.Context, userID uuid.UUID) ([]DeckStats, error)
}

type Handler struct {
	svc decksServicer
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func newHandlerWithService(svc decksServicer) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(g *gin.RouterGroup) {
	g.Use(auth.Middleware())
	g.GET("/stats", h.stats)
	g.POST("", h.create)
	g.POST("/", h.create)
	g.GET("", h.list)
	g.GET("/", h.list)
	g.GET("/:id", h.get)
	g.PUT("/:id", h.update)
	g.DELETE("/:id", h.delete)
}

type deckResp struct {
	ID                 string   `json:"id"`
	UserID             string   `json:"userId"`
	ModuleID           *string  `json:"moduleId"`
	Name               string   `json:"name"`
	Description        string   `json:"description,omitempty"`
	Tags               []string `json:"tags"`
	NewCardsDailyLimit int32    `json:"newCardsDailyLimit"`
	CreatedAt          string   `json:"createdAt"`
	UpdatedAt          string   `json:"updatedAt"`
}

type createReq struct {
	Name               string   `json:"name" binding:"required,min=1,max=255"`
	ModuleID           *string  `json:"moduleId"`
	Description        *string  `json:"description"`
	Tags               []string `json:"tags"`
	NewCardsDailyLimit int32    `json:"newCardsDailyLimit"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	if req.NewCardsDailyLimit == 0 {
		req.NewCardsDailyLimit = 10
	}
	if req.Tags == nil {
		req.Tags = []string{}
	}
	moduleID, err := parseOptionalUUID(req.ModuleID)
	if err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, "invalid moduleId"))
		return
	}
	deck, err := h.svc.Create(c.Request.Context(), CreateInput{
		UserID: uid, ModuleID: moduleID, Name: req.Name, Description: req.Description,
		Tags: req.Tags, NewCardsDailyLimit: req.NewCardsDailyLimit,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(deck))
}

func (h *Handler) list(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	page := pagination.Parse(c.Query("page"), c.Query("pageSize"))
	decks, err := h.svc.ListByUser(c.Request.Context(), uid, page)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]deckResp, 0, len(decks))
	for _, d := range decks {
		out = append(out, toResp(d))
	}
	c.JSON(http.StatusOK, out)
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	d, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(d))
}

type updateReq struct {
	Name               *string  `json:"name"`
	ModuleID           *string  `json:"moduleId"`
	Description        *string  `json:"description"`
	Tags               []string `json:"tags"`
	NewCardsDailyLimit *int32   `json:"newCardsDailyLimit"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	var req updateReq
	if err := json.Unmarshal(body, &req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	moduleIDSet := false
	var moduleID *uuid.UUID
	if _, ok := raw["moduleId"]; ok {
		moduleIDSet = true
		if string(raw["moduleId"]) != "null" {
			parsed, parseErr := parseOptionalUUID(req.ModuleID)
			if parseErr != nil {
				auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, "invalid moduleId"))
				return
			}
			moduleID = parsed
		}
	}
	d, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Name: req.Name, Description: req.Description, Tags: req.Tags,
		NewCardsDailyLimit: req.NewCardsDailyLimit,
		ModuleID: moduleID, ModuleIDSet: moduleIDSet,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(d))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func toResp(d Deck) deckResp {
	desc := ""
	if d.Description != nil {
		desc = *d.Description
	}
	tags := d.Tags
	if tags == nil {
		tags = []string{}
	}
	var moduleID *string
	if d.ModuleID != nil {
		s := d.ModuleID.String()
		moduleID = &s
	}
	return deckResp{
		ID: d.ID.String(), UserID: d.UserID.String(), ModuleID: moduleID,
		Name: d.Name, Description: desc, Tags: tags, NewCardsDailyLimit: d.NewCardsDailyLimit,
		CreatedAt: d.CreatedAt, UpdatedAt: d.UpdatedAt,
	}
}

func parseOptionalUUID(raw *string) (*uuid.UUID, error) {
	if raw == nil || *raw == "" {
		return nil, nil
	}
	id, err := uuid.Parse(*raw)
	if err != nil {
		return nil, err
	}
	return &id, nil
}
