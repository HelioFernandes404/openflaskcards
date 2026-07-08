package cards

import (
	"net/http"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/gin-gonic/gin"
)

type browseFilterOptionResp struct {
	Type  string `json:"type"`
	Value string `json:"value"`
	Label string `json:"label"`
	Count int64  `json:"count"`
}

type browseFilterSectionResp struct {
	ID      string                   `json:"id"`
	Title   string                   `json:"title"`
	Options []browseFilterOptionResp `json:"options"`
}

type browseFiltersResp struct {
	TotalCards int64                     `json:"totalCards"`
	Sections   []browseFilterSectionResp `json:"sections"`
}

func (h *Handler) browseFilters(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	filters, err := h.svc.BrowseFilters(c.Request.Context(), uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}

	sections := make([]browseFilterSectionResp, 0, len(filters.Sections))
	for _, section := range filters.Sections {
		options := make([]browseFilterOptionResp, 0, len(section.Options))
		for _, opt := range section.Options {
			options = append(options, browseFilterOptionResp{
				Type:  opt.Type,
				Value: opt.Value,
				Label: opt.Label,
				Count: opt.Count,
			})
		}
		sections = append(sections, browseFilterSectionResp{
			ID:      section.ID,
			Title:   section.Title,
			Options: options,
		})
	}

	c.JSON(http.StatusOK, browseFiltersResp{
		TotalCards: filters.TotalCards,
		Sections:   sections,
	})
}

func (h *Handler) browse(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	cards, err := h.svc.Browse(c.Request.Context(), uid, BrowseQuery{
		FilterType:  c.Query("filterType"),
		FilterValue: c.Query("filterValue"),
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}

	out := make([]cardResp, 0, len(cards))
	for _, card := range cards {
		out = append(out, toResp(card))
	}
	c.JSON(http.StatusOK, out)
}
