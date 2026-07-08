package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const HeaderRequestID = "X-Request-ID"

const ctxRequestIDKey = "request_id"

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(HeaderRequestID)
		if id == "" {
			id = uuid.New().String()
		}
		c.Set(ctxRequestIDKey, id)
		c.Header(HeaderRequestID, id)
		c.Next()
	}
}

func RequestIDFrom(c *gin.Context) string {
	v, ok := c.Get(ctxRequestIDKey)
	if !ok {
		return ""
	}
	id, ok := v.(string)
	if !ok {
		return ""
	}
	return id
}
