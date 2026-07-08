package auth

import (
	"net/http"
	"strings"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const ctxUserIDKey = "userID"

func Middleware(jwt *JWTManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    apperror.ErrUnauthorized.Code,
				"message": "missing or invalid Authorization header",
			})
			return
		}
		token := strings.TrimPrefix(header, "Bearer ")
		claims, err := jwt.Parse(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"code":    apperror.ErrInvalidToken.Code,
				"message": "invalid token",
			})
			return
		}
		c.Set(ctxUserIDKey, claims.UserID)
		c.Next()
	}
}

func UserIDFrom(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get(ctxUserIDKey)
	if !ok {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}
