package cards

import (
	"net/http"
	"strconv"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type reviewReq struct {
	Rating           int    `json:"rating" binding:"required,min=1,max=4"`
	ReviewDurationMs *int32 `json:"reviewDurationMs"`
}

type reviewResp struct {
	CardID     string  `json:"cardId"`
	State      string  `json:"state"`
	Stability  float64 `json:"stability"`
	Difficulty float64 `json:"difficulty"`
	Due        string  `json:"due"`
	LastReview string  `json:"lastReview"`
	Reps       int32   `json:"reps"`
	Lapses     int32   `json:"lapses"`
}

func (h *Handler) review(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrCardNotFound)
		return
	}
	var req reviewReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	out, err := h.svc.SubmitReview(c.Request.Context(), ReviewInput{
		CardID: id, UserID: uid, Rating: req.Rating, ReviewDurationMs: req.ReviewDurationMs,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	last := ""
	if out.Card.LastReview != nil {
		last = out.Card.LastReview.Format(time.RFC3339)
	}
	c.JSON(http.StatusOK, reviewResp{
		CardID: out.Card.ID.String(), State: out.Card.State,
		Stability: out.Card.Stability, Difficulty: out.Card.Difficulty,
		Due: out.Card.Due.Format(time.RFC3339), LastReview: last,
		Reps: out.Card.Reps, Lapses: out.Card.Lapses,
	})
}

func (h *Handler) listDue(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	limit := int32(50)
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		limit = int32(v)
	}
	offset := int32(0)
	if v, err := strconv.Atoi(c.Query("offset")); err == nil && v > 0 {
		offset = int32(v)
	}
	cards, total, err := h.svc.ListDueByUser(c.Request.Context(), uid, limit, offset)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]cardResp, 0, len(cards))
	for _, card := range cards {
		out = append(out, toResp(card))
	}
	c.JSON(http.StatusOK, gin.H{"cards": out, "totalDue": total})
}

type dueSummaryResp struct {
	Cards                  []cardFrontResp `json:"cards"`
	TotalDue               int             `json:"totalDue"`
	NewCardsDailyLimit     int32           `json:"newCardsDailyLimit"`
	NewCardsStudiedToday   int64           `json:"newCardsStudiedToday"`
	RemainingNewCardsToday int64           `json:"remainingNewCardsToday"`
	IsNewCardsLimitReached bool            `json:"isNewCardsLimitReached"`
}

func (h *Handler) dueSummary(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	deckID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	limit := int32(200)
	if v, err := strconv.Atoi(c.Query("limit")); err == nil && v > 0 {
		limit = int32(v)
	}
	offset := int32(0)
	if v, err := strconv.Atoi(c.Query("offset")); err == nil && v > 0 {
		offset = int32(v)
	}
	summary, err := h.svc.DueSummaryByDeck(c.Request.Context(), deckID, uid, limit, offset)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	fronts := make([]cardFrontResp, 0, len(summary.Cards))
	for _, card := range summary.Cards {
		f := cardFrontResp{
			ID: card.ID.String(), DeckID: card.DeckID.String(),
			Front: card.Front, TTSEnabled: card.TTSEnabled,
			State: card.State, Reps: card.Reps,
		}
		if card.AudioURL != nil {
			f.AudioURL = *card.AudioURL
		}
		if card.ImagemURL != nil {
			f.ImagemURL = *card.ImagemURL
		}
		fronts = append(fronts, f)
	}
	c.JSON(http.StatusOK, dueSummaryResp{
		Cards:                  fronts,
		TotalDue:               int(summary.TotalDue),
		NewCardsDailyLimit:     summary.NewCardsDailyLimit,
		NewCardsStudiedToday:   summary.NewCardsStudiedToday,
		RemainingNewCardsToday: summary.RemainingNewCardsToday,
		IsNewCardsLimitReached: summary.IsNewCardsLimitReached,
	})
}
