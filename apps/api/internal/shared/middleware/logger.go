package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const ctxBaseLoggerKey = "base_logger"

func InjectLogger(log *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(ctxBaseLoggerKey, log)
		c.Next()
	}
}

func Logger(c *gin.Context) *zap.Logger {
	v, ok := c.Get(ctxBaseLoggerKey)
	if !ok {
		return zap.NewNop()
	}
	base, ok := v.(*zap.Logger)
	if !ok || base == nil {
		return zap.NewNop()
	}

	fields := []zap.Field{zap.String("request_id", RequestIDFrom(c))}
	if uid, ok := userIDFrom(c); ok {
		fields = append(fields, zap.String("user_id", uid.String()))
	}
	return base.With(fields...)
}

func userIDFrom(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get("userID")
	if !ok {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}
