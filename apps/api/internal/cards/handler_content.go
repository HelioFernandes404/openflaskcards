package cards

import (
	"net/http"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/middleware"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type cardFrontResp struct {
	ID         string `json:"id"`
	DeckID     string `json:"deckId"`
	Front      string `json:"front"`
	ImagemURL  string `json:"imagemUrl,omitempty"`
	AudioURL   string `json:"audioUrl,omitempty"`
	TTSEnabled bool   `json:"ttsEnabled"`
	State      string `json:"state"`
	Reps       int32  `json:"reps"`
}

func (h *Handler) getFront(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	card, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	resp := cardFrontResp{
		ID: card.ID.String(), DeckID: card.DeckID.String(),
		Front: card.Front, TTSEnabled: card.TTSEnabled,
		State: card.State, Reps: card.Reps,
	}
	if card.AudioURL != nil {
		resp.AudioURL = *card.AudioURL
	}
	if card.ImagemURL != nil {
		resp.ImagemURL = *card.ImagemURL
	}
	c.JSON(http.StatusOK, resp)
}

type cardBackResp struct {
	ID         string  `json:"id"`
	DeckID     string  `json:"deckId"`
	Front      string  `json:"front"`
	AudioURL   string  `json:"audioUrl,omitempty"`
	Fonetica   string  `json:"fonetica,omitempty"`
	Back       string  `json:"back"`
	ImagemURL  string  `json:"imagemUrl,omitempty"`
	TTSAudio   string  `json:"ttsAudio,omitempty"`
	Stability  float64 `json:"stability"`
	Difficulty float64 `json:"difficulty"`
	Due        string  `json:"due"`
	LastReview string  `json:"lastReview,omitempty"`
	State      string  `json:"state"`
	Reps       int32   `json:"reps"`
	Lapses     int32   `json:"lapses"`
}

func (h *Handler) getBack(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	card, err := h.svc.GetByID(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	resp := cardBackResp{
		ID: card.ID.String(), DeckID: card.DeckID.String(),
		Front: card.Front, Back: card.Back,
		Stability: card.Stability, Difficulty: card.Difficulty,
		Due: card.Due.Format(time.RFC3339), State: card.State,
		Reps: card.Reps, Lapses: card.Lapses,
	}
	if card.AudioURL != nil {
		resp.AudioURL = *card.AudioURL
	}
	if card.Fonetica != nil {
		resp.Fonetica = *card.Fonetica
	}
	if card.ImagemURL != nil {
		resp.ImagemURL = *card.ImagemURL
	}
	if card.LastReview != nil {
		resp.LastReview = card.LastReview.Format(time.RFC3339)
	}
	if card.TTSEnabled {
		// Best-effort: the card content is already fetched and shouldn't be
		// blocked by a TTS provider outage. A dedicated /audio route exists
		// for the client to retry fetching just the audio separately.
		b64, err := h.svc.GetAudio(c.Request.Context(), card.ID, uid)
		if err != nil {
			middleware.Logger(c).Warn("tts audio unavailable for card back, returning without audio",
				zap.String("cardId", card.ID.String()), zap.Error(err))
		} else {
			resp.TTSAudio = b64
		}
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) audio(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	b64, err := h.svc.GetAudio(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"audioBase64": b64})
}

type synthesizeTextReq struct {
	Text string `json:"text" binding:"required,min=1,max=5000"`
}

func (h *Handler) synthesizeText(c *gin.Context) {
	var req synthesizeTextReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	b64, err := h.svc.SynthesizeText(c.Request.Context(), req.Text)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"audioBase64": b64})
}
