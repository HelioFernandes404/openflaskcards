package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func setupSecurityHeadersRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(SecurityHeaders())
	r.GET("/anything", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return r
}

func TestSecurityHeaders_SetsExpectedHeadersOnResponse(t *testing.T) {
	r := setupSecurityHeadersRouter()

	req := httptest.NewRequest(http.MethodGet, "/anything", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	cases := map[string]string{
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
		"Referrer-Policy":        "strict-origin-when-cross-origin",
	}

	for header, want := range cases {
		if got := rec.Header().Get(header); got != want {
			t.Errorf("header %s = %q, want %q", header, got, want)
		}
	}
}

func TestSecurityHeaders_DoesNotOverrideHandlerSetHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(SecurityHeaders())
	r.GET("/custom", func(c *gin.Context) {
		c.Header("X-Frame-Options", "SAMEORIGIN")
		c.Status(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/custom", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if got := rec.Header().Get("X-Frame-Options"); got != "SAMEORIGIN" {
		t.Errorf("X-Frame-Options = %q, want handler-set value %q to survive", got, "SAMEORIGIN")
	}
}
