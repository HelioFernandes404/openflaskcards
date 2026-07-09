package auth

import (
	"errors"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/middleware"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/userresp"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes wires the auth endpoints. sensitiveMiddleware (e.g. a rate
// limiter) is applied only to the credential-guessing surface — register,
// login, refresh — not to logout/me, which don't benefit from it the same way.
func (h *Handler) RegisterRoutes(g *gin.RouterGroup, sensitiveMiddleware ...gin.HandlerFunc) {
	sensitive := g.Group("", sensitiveMiddleware...)
	sensitive.POST("/register", h.register)
	sensitive.POST("/login", h.login)
	sensitive.POST("/refresh", h.refresh)
	sensitive.POST("/forgot-password", h.forgotPassword)
	sensitive.POST("/reset-password", h.resetPassword)
	g.POST("/logout", h.logout)
	g.POST("/logout-all", Middleware(h.svc.jwt), h.logoutAll)
	g.GET("/me", Middleware(h.svc.jwt), h.me)
}

type registerReq struct {
	Email    string `json:"email" binding:"required,email"`
	Nickname string `json:"nickname" binding:"required,min=1,max=30"`
	Name     string `json:"name"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *Handler) register(c *gin.Context) {
	var req registerReq
	if err := c.ShouldBindJSON(&req); err != nil {
		WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	_, tok, err := h.svc.Register(c.Request.Context(), RegisterInput{
		Email: req.Email, Nickname: req.Nickname, Name: req.Name, Password: req.Password,
	}, c.Request.UserAgent())
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, tokenResp{
		AccessToken: tok.AccessToken, RefreshToken: tok.RefreshToken,
		TokenType: "bearer", ExpiresIn: tok.ExpiresIn,
	})
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=1"`
}

type tokenResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
}

func (h *Handler) login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	tok, err := h.svc.Login(c.Request.Context(), req.Email, req.Password, c.Request.UserAgent())
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, tokenResp{
		AccessToken: tok.AccessToken, RefreshToken: tok.RefreshToken,
		TokenType: "bearer", ExpiresIn: tok.ExpiresIn,
	})
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token" binding:"required,min=1"`
}

func (h *Handler) refresh(c *gin.Context) {
	var req refreshReq
	if err := c.ShouldBindJSON(&req); err != nil {
		WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	tok, err := h.svc.Refresh(c.Request.Context(), req.RefreshToken)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, tokenResp{
		AccessToken: tok.AccessToken, RefreshToken: tok.RefreshToken,
		TokenType: "bearer", ExpiresIn: tok.ExpiresIn,
	})
}

type forgotPasswordReq struct {
	Email string `json:"email" binding:"required,email"`
}

// forgotPassword always responds 200 regardless of whether the email
// belongs to an account, so this endpoint can't be used to enumerate
// registered emails.
func (h *Handler) forgotPassword(c *gin.Context) {
	var req forgotPasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	if err := h.svc.RequestPasswordReset(c.Request.Context(), req.Email); err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "If an account exists for that email, a reset link has been sent.",
	})
}

type resetPasswordReq struct {
	Token    string `json:"token" binding:"required,min=1"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *Handler) resetPassword(c *gin.Context) {
	var req resetPasswordReq
	if err := c.ShouldBindJSON(&req); err != nil {
		WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	if err := h.svc.ResetPassword(c.Request.Context(), req.Token, req.Password); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

type logoutReq struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *Handler) logout(c *gin.Context) {
	var req logoutReq
	_ = c.ShouldBindJSON(&req)
	if err := h.svc.Logout(c.Request.Context(), req.RefreshToken); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) logoutAll(c *gin.Context) {
	uid, _ := UserIDFrom(c)
	if err := h.svc.LogoutAll(c.Request.Context(), uid); err != nil {
		WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) me(c *gin.Context) {
	uid, _ := UserIDFrom(c)
	u, err := h.svc.GetUser(c.Request.Context(), uid)
	if err != nil {
		WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, userresp.ToResp(userresp.Fields{
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
	}))
}

// WriteError maps domain errors to HTTP responses. Exposed so other features can reuse it.
func WriteError(c *gin.Context, err error) {
	log := middleware.Logger(c)
	requestID := middleware.RequestIDFrom(c)

	var ae *apperror.AppError
	if errors.As(err, &ae) {
		if ae.Status >= http.StatusInternalServerError {
			log.Error("domain error",
				zap.String("code", ae.Code),
				zap.Int("status", ae.Status),
				zap.String("message", ae.Message),
			)
		} else {
			log.Debug("client error",
				zap.String("code", ae.Code),
				zap.Int("status", ae.Status),
			)
		}
		c.JSON(ae.Status, gin.H{"code": ae.Code, "message": ae.Message})
		return
	}

	log.Error("unhandled error",
		zap.Error(err),
		zap.String("method", c.Request.Method),
		zap.String("path", c.Request.URL.Path),
	)

	body := gin.H{"code": "INTERNAL_ERROR", "message": "internal server error"}
	if requestID != "" {
		body["request_id"] = requestID
	}
	c.JSON(http.StatusInternalServerError, body)
}
