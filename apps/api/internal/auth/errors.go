package auth

import (
	"errors"
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/middleware"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

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
