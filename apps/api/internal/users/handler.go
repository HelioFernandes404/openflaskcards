package users

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/userresp"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	svc     *Service
	authSvc *auth.Service
	jwt     *auth.JWTManager
}

func NewHandler(svc *Service, authSvc *auth.Service, jwt *auth.JWTManager) *Handler {
	return &Handler{svc: svc, authSvc: authSvc, jwt: jwt}
}

func (h *Handler) RegisterRoutes(g *gin.RouterGroup) {
	g.Use(auth.Middleware(h.jwt))
	g.GET("/me", h.me)
	g.PATCH("/me", h.updateMe)
	g.PATCH("/me/fsrs", h.updateFSRS)
	g.POST("/me/fsrs/optimize", h.optimizeFSRS)
}

func (h *Handler) me(c *gin.Context) {
	uid, ok := auth.UserIDFrom(c)
	if !ok {
		auth.WriteError(c, apperror.ErrUnauthorized)
		return
	}
	u, err := h.svc.GetByID(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(u))
}

type updateMeReq struct {
	Email    *string `json:"email" binding:"omitempty,email"`
	Nickname *string `json:"nickname"`
	Name     *string `json:"name"`
	Password *string `json:"password" binding:"omitempty,min=8"`
	// CurrentPassword must match the account's existing password when
	// Password is set and the account already has a local password.
	CurrentPassword *string `json:"currentPassword"`
	Timezone        *string `json:"timezone"`
}

func (h *Handler) updateMe(c *gin.Context) {
	uid, ok := auth.UserIDFrom(c)
	if !ok {
		auth.WriteError(c, apperror.ErrUnauthorized)
		return
	}
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	c.Request.Body = io.NopCloser(bytes.NewReader(body))

	var req updateMeReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}

	// A *string can't tell "timezone omitted" from "timezone: null" — both
	// unmarshal to a nil pointer. Check the raw body for key presence so an
	// explicit null clears the timezone instead of being silently ignored.
	var raw map[string]json.RawMessage
	_ = json.Unmarshal(body, &raw)
	_, timezoneSet := raw["timezone"]

	in := UpdateInput{
		Email:           req.Email,
		Nickname:        req.Nickname,
		Name:            req.Name,
		CurrentPassword: req.CurrentPassword,
		Timezone:        req.Timezone,
		TimezoneSet:     timezoneSet,
	}
	if req.Password != nil {
		hashed, err := auth.HashPassword(*req.Password)
		if err != nil {
			auth.WriteError(c, err)
			return
		}
		in.Password = &hashed
	}
	u, err := h.svc.Update(c.Request.Context(), uid, in)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	// Changing the password should end every other session: otherwise a
	// stolen refresh token from a compromised device stays valid even after
	// the owner changes their password to try to lock the attacker out.
	if req.Password != nil && h.authSvc != nil {
		if err := h.authSvc.LogoutAll(c.Request.Context(), uid); err != nil {
			auth.WriteError(c, err)
			return
		}
	}
	c.JSON(http.StatusOK, toResp(u))
}

type updateFSRSReq struct {
	Weights          []float64 `json:"weights"`
	DesiredRetention *float64  `json:"desired_retention"`
}

func (h *Handler) updateFSRS(c *gin.Context) {
	uid, ok := auth.UserIDFrom(c)
	if !ok {
		auth.WriteError(c, apperror.ErrUnauthorized)
		return
	}
	var req updateFSRSReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", 422, err.Error()))
		return
	}
	u, err := h.svc.UpdateFSRS(c.Request.Context(), uid, UpdateFSRSInput{
		Weights:          req.Weights,
		DesiredRetention: req.DesiredRetention,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(u))
}

type optimizeFSRSResp struct {
	Status string `json:"status"`
}

func (h *Handler) optimizeFSRS(c *gin.Context) {
	uid, ok := auth.UserIDFrom(c)
	if !ok {
		auth.WriteError(c, apperror.ErrUnauthorized)
		return
	}
	status, err := h.svc.StartOptimizeFSRS(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusAccepted, optimizeFSRSResp{Status: status})
}

func toResp(u User) userresp.Resp {
	return userresp.ToResp(userresp.Fields{
		ID:                 u.ID.String(),
		Email:              u.Email,
		Nickname:           u.Nickname,
		Name:               u.Name,
		IsEmailVerified:    u.IsEmailVerified,
		Provider:           u.Provider,
		Providers:          u.Providers,
		FSRSParameters:     u.FSRSParameters,
		DesiredRetention:   u.DesiredRetention,
		OptimizationStatus: u.OptimizationStatus,
		LastOptimization:   u.LastOptimization,
		Timezone:           u.Timezone,
		CreatedAt:          u.CreatedAt,
		UpdatedAt:          u.UpdatedAt,
	})
}
