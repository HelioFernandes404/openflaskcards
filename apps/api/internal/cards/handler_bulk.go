package cards

import (
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type cardExportItem struct {
	Front    string `json:"front"`
	Back     string `json:"back"`
	Fonetica string `json:"fonetica,omitempty"`
}

func (h *Handler) exportDeck(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	deckID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	cards, err := h.svc.ListByDeck(c.Request.Context(), deckID, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	out := make([]cardExportItem, 0, len(cards))
	for _, card := range cards {
		item := cardExportItem{
			Front: card.Front, Back: card.Back,
		}
		if card.Fonetica != nil {
			item.Fonetica = *card.Fonetica
		}
		out = append(out, item)
	}
	c.JSON(http.StatusOK, out)
}

type bulkItem struct {
	Front      string  `json:"front" binding:"required,min=1,max=5000"`
	Back       string  `json:"back" binding:"required,min=1,max=5000"`
	Fonetica   *string `json:"fonetica"`
	TTSEnabled *bool   `json:"ttsEnabled"`
}

type bulkOptions struct {
	SkipInvalidRows bool `json:"skipInvalidRows"`
	TrimWhitespace  bool `json:"trimWhitespace"`
}

type bulkCreateReq struct {
	DeckID  string       `json:"deckId" binding:"required"`
	Cards   []bulkItem   `json:"cards" binding:"required,min=1,max=5000,dive"`
	Options *bulkOptions `json:"options"`
}

type bulkErrorResp struct {
	Index   int    `json:"index"`
	Field   string `json:"field,omitempty"`
	Message string `json:"message"`
}

type bulkResultResp struct {
	Created int             `json:"created"`
	Failed  int             `json:"failed"`
	Errors  []bulkErrorResp `json:"errors"`
}

func (h *Handler) bulkCreate(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	var req bulkCreateReq
	if err := c.ShouldBindJSON(&req); err != nil {
		auth.WriteError(c, apperror.New("VALIDATION_ERROR", http.StatusUnprocessableEntity, err.Error()))
		return
	}
	deckID, err := uuid.Parse(req.DeckID)
	if err != nil {
		auth.WriteError(c, apperror.ErrDeckNotFound)
		return
	}
	items := make([]BulkItemInput, 0, len(req.Cards))
	for _, item := range req.Cards {
		items = append(items, BulkItemInput{
			Front: item.Front, Back: item.Back,
			Fonetica: item.Fonetica, TTSEnabled: item.TTSEnabled,
		})
	}
	var opts BulkOptions
	if req.Options != nil {
		opts = BulkOptions{SkipInvalidRows: req.Options.SkipInvalidRows, TrimWhitespace: req.Options.TrimWhitespace}
	}
	out, err := h.svc.BulkCreate(c.Request.Context(), BulkCreateInput{
		DeckID: deckID, UserID: uid, Items: items, Options: opts,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	errs := make([]bulkErrorResp, 0, len(out.Errors))
	for _, e := range out.Errors {
		errs = append(errs, bulkErrorResp{Index: e.Index, Message: e.Message})
	}
	c.JSON(http.StatusOK, bulkResultResp{
		Created: out.Created, Failed: len(errs), Errors: errs,
	})
}
