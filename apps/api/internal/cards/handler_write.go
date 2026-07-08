package cards

import (
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type createReq struct {
	DeckID     string  `json:"deckId" binding:"required"`
	Front      string  `json:"front" binding:"required,min=1"`
	Back       string  `json:"back" binding:"required,min=1"`
	AudioURL   *string `json:"audioUrl"`
	ImagemURL  *string `json:"imagemUrl"`
	Fonetica   *string `json:"fonetica"`
	TTSEnabled *bool   `json:"ttsEnabled"`
}

func (h *Handler) create(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req createReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	deckID, err := uuid.Parse(req.DeckID)
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	ttsEnabled := true
	if req.TTSEnabled != nil {
		ttsEnabled = *req.TTSEnabled
	}
	card, err := h.svc.Create(c.Request.Context(), CreateInput{
		DeckID:     deckID,
		UserID:     uid,
		Front:      req.Front,
		Back:       req.Back,
		AudioURL:   req.AudioURL,
		ImagemURL:  req.ImagemURL,
		Fonetica:   req.Fonetica,
		TTSEnabled: ttsEnabled,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(card))
}

type updateReq struct {
	Front      *string `json:"front"`
	Back       *string `json:"back"`
	AudioURL   *string `json:"audioUrl"`
	ImagemURL  *string `json:"imagemUrl"`
	Fonetica   *string `json:"fonetica"`
	TTSEnabled *bool   `json:"ttsEnabled"`
}

func (h *Handler) update(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	var req updateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	card, err := h.svc.Update(c.Request.Context(), id, uid, UpdateInput{
		Front: req.Front, Back: req.Back,
		AudioURL: req.AudioURL, ImagemURL: req.ImagemURL,
		Fonetica: req.Fonetica, TTSEnabled: req.TTSEnabled,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(card))
}

type moveReq struct {
	DeckID string `json:"deckId" binding:"required"`
}

func (h *Handler) move(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	var req moveReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	newDeckID, err := uuid.Parse(req.DeckID)
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	card, err := h.svc.Move(c.Request.Context(), id, newDeckID, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, toResp(card))
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
