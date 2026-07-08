package cards

import (
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handler) fsrsDebug(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	result, err := h.svc.FSRSDebug(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
