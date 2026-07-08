package decks

import (
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/gin-gonic/gin"
)

type deckStatsResp struct {
	DeckID               string `json:"deckId"`
	NewCount             int64  `json:"newCount"`
	LearningCount        int64  `json:"learningCount"`
	ReviewCount          int64  `json:"reviewCount"`
	TotalCards           int64  `json:"totalCards"`
	NewCardsStudiedToday int64  `json:"newCardsStudiedToday"`
	NewCardsDailyLimit   int32  `json:"newCardsDailyLimit"`
}

func (h *Handler) stats(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	stats, err := h.svc.StatsByUser(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]deckStatsResp, 0, len(stats))
	for _, s := range stats {
		out = append(out, deckStatsResp{
			DeckID: s.DeckID.String(), NewCount: s.NewCount, LearningCount: s.LearningCount,
			ReviewCount: s.ReviewCount, TotalCards: s.TotalCards,
			NewCardsStudiedToday: s.NewCardsStudiedToday, NewCardsDailyLimit: s.NewCardsDailyLimit,
		})
	}
	c.JSON(http.StatusOK, out)
}
