package media

import (
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/HelioFernandes404/openflashcards/apps/api/internal/auth"
	"github.com/HelioFernandes404/openflashcards/apps/api/internal/shared/apperror"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(g *gin.RouterGroup) {
	g.Use(auth.Middleware())
	g.POST("/images", h.uploadImage)
	g.GET("/:id", h.get)
	g.DELETE("/:id", h.delete)
}

type mediaResp struct {
	ID               string `json:"id"`
	URL              string `json:"url"`
	Kind             string `json:"kind"`
	ContentType      string `json:"contentType"`
	SizeBytes        int64  `json:"sizeBytes"`
	OriginalFilename string `json:"originalFilename,omitempty"`
	CreatedAt        string `json:"createdAt"`
}

func toResp(m Media) mediaResp {
	orig := ""
	if m.OriginalFilename != nil {
		orig = *m.OriginalFilename
	}
	return mediaResp{
		ID:               m.ID.String(),
		URL:              m.URL(),
		Kind:             m.Kind,
		ContentType:      m.ContentType,
		SizeBytes:        m.SizeBytes,
		OriginalFilename: orig,
		CreatedAt:        m.CreatedAt.Format(time.RFC3339),
	}
}

func (h *Handler) uploadImage(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)

	// Bound the request body before any multipart parsing buffers it into
	// memory. The +1 lets the service distinguish "at limit" from "over limit"
	// while still rejecting truly oversized uploads here.
	maxBytes := h.svc.MaxBytes()
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes+1)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		if isBodyTooLarge(err) {
			auth.WriteError(c, apperror.ErrMediaTooLarge)
			return
		}
		auth.WriteError(c, apperror.New(apperror.ErrValidation.Code, apperror.ErrValidation.Status, "file is required"))
		return
	}
	f, err := fileHeader.Open()
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	defer func() { _ = f.Close() }()
	data, err := io.ReadAll(f)
	if err != nil {
		if isBodyTooLarge(err) {
			auth.WriteError(c, apperror.ErrMediaTooLarge)
			return
		}
		auth.WriteError(c, err)
		return
	}
	m, err := h.svc.Upload(c.Request.Context(), UploadInput{
		UserID:           uid,
		Data:             data,
		OriginalFilename: fileHeader.Filename,
	})
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.JSON(http.StatusCreated, toResp(m))
}

func (h *Handler) get(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrMediaNotFound)
		return
	}
	m, data, err := h.svc.GetWithBytes(c.Request.Context(), id, uid)
	if err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Header("Cache-Control", "private, max-age=3600")
	c.Data(http.StatusOK, m.ContentType, data)
}

func (h *Handler) delete(c *gin.Context) {
	uid, _ := auth.UserIDFrom(c)
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		auth.WriteError(c, apperror.ErrMediaNotFound)
		return
	}
	if err := h.svc.Delete(c.Request.Context(), id, uid); err != nil {
		auth.WriteError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// isBodyTooLarge reports whether err is the "request body too large" error
// produced by http.MaxBytesReader, so the handler can map it to 413.
func isBodyTooLarge(err error) bool {
	var maxErr *http.MaxBytesError
	return errors.As(err, &maxErr)
}
