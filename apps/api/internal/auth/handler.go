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
	svc            *Service
	refreshTTLDays int
	cookieSecure   bool
}

// refreshCookieName is the httpOnly cookie carrying the refresh token. It is
// never included in a JSON response body or readable by client JS — see
// setRefreshCookie/clearRefreshCookie.
const refreshCookieName = "refresh_token"

// refreshCookiePath scopes the cookie to the auth surface (login/register
// set it, refresh/logout read and clear it) instead of sending it on every
// API request.
const refreshCookiePath = "/api/v1/auth"

// NewHandler defaults refreshTTLDays to 30 and cookieSecure to true. Prefer
// NewHandlerWithConfig in production wiring so the cookie's Max-Age tracks
// the actual configured refresh token TTL.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc, refreshTTLDays: 30, cookieSecure: true}
}

// NewHandlerWithConfig lets the caller pin the cookie's Max-Age (must match
// REFRESH_TOKEN_EXPIRE_DAYS) and whether the Secure attribute is set. Secure
// should only be disabled for local development over plain HTTP; production
// must always pass true.
func NewHandlerWithConfig(svc *Service, refreshTTLDays int, cookieSecure bool) *Handler {
	return &Handler{svc: svc, refreshTTLDays: refreshTTLDays, cookieSecure: cookieSecure}
}

// setRefreshCookie sets the httpOnly, SameSite=Strict refresh token cookie.
// gin's ctx.SetCookie has no SameSite parameter, so SetSameSite must be
// called first — otherwise the attribute silently defaults away from Strict.
func (h *Handler) setRefreshCookie(c *gin.Context, token string) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(refreshCookieName, token, h.refreshTTLDays*24*3600, refreshCookiePath, "", h.cookieSecure, true)
}

// clearRefreshCookie deletes the cookie. Path must match exactly what it was
// set with, or the browser treats it as a distinct cookie and keeps the old one.
func (h *Handler) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(refreshCookieName, "", -1, refreshCookiePath, "", h.cookieSecure, true)
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
	h.setRefreshCookie(c, tok.RefreshToken)
	c.JSON(http.StatusCreated, tokenResp{
		AccessToken: tok.AccessToken,
		TokenType:   "bearer", ExpiresIn: tok.ExpiresIn,
	})
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=1"`
}

// tokenResp is the login/register/refresh response body. The refresh token
// never appears here — it is set as an httpOnly cookie instead (see
// setRefreshCookie), so it can't be read or exfiltrated by client-side JS.
type tokenResp struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
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
	h.setRefreshCookie(c, tok.RefreshToken)
	c.JSON(http.StatusOK, tokenResp{
		AccessToken: tok.AccessToken,
		TokenType:   "bearer", ExpiresIn: tok.ExpiresIn,
	})
}

// refreshTokenFromRequest reads the refresh token from the httpOnly cookie.
// The client never sends it in the body anymore — the cookie is attached
// automatically by the browser (credentials: 'include' on the frontend).
func refreshTokenFromRequest(c *gin.Context) string {
	token, _ := c.Cookie(refreshCookieName)
	return token
}

func (h *Handler) refresh(c *gin.Context) {
	refreshToken := refreshTokenFromRequest(c)
	if refreshToken == "" {
		// 401, not 422: a missing cookie means "not authenticated", the
		// same signal the frontend already treats as a definitive refresh
		// failure (see isDefinitiveRefreshFailure in apiClientAuth.ts).
		WriteError(c, apperror.ErrInvalidToken)
		return
	}
	tok, err := h.svc.Refresh(c.Request.Context(), refreshToken)
	if err != nil {
		WriteError(c, err)
		return
	}
	h.setRefreshCookie(c, tok.RefreshToken)
	c.JSON(http.StatusOK, tokenResp{
		AccessToken: tok.AccessToken,
		TokenType:   "bearer", ExpiresIn: tok.ExpiresIn,
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

func (h *Handler) logout(c *gin.Context) {
	refreshToken := refreshTokenFromRequest(c)
	if err := h.svc.Logout(c.Request.Context(), refreshToken); err != nil {
		WriteError(c, err)
		return
	}
	h.clearRefreshCookie(c)
	c.Status(http.StatusNoContent)
}

func (h *Handler) logoutAll(c *gin.Context) {
	uid, _ := UserIDFrom(c)
	if err := h.svc.LogoutAll(c.Request.Context(), uid); err != nil {
		WriteError(c, err)
		return
	}
	// logout-all revokes every refresh token for the user, including the
	// one this browser is holding — its cookie must go too.
	h.clearRefreshCookie(c)
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
