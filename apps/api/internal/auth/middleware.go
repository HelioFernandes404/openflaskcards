package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const ctxUserIDKey = "userID"

// DefaultUserID is the single, fixed user identity used across the API now
// that multi-user auth has been stripped. Every request is treated as this
// user; the DB schema and user_id-scoped queries are untouched.
var DefaultUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

// Middleware stamps every request with DefaultUserID. There is no JWT/session
// check anymore — this is a single-user deployment.
func Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set(ctxUserIDKey, DefaultUserID)
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
