package media

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func setupRouter(t *testing.T) (*gin.Engine, *fakeJWT, *fakeRepo) {
	t.Helper()
	return setupRouterWithMax(t, 10*1024*1024)
}

func setupRouterWithMax(t *testing.T, maxBytes int64) (*gin.Engine, *fakeJWT, *fakeRepo) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	repo := newFakeRepo()
	svc := NewService(repo, t.TempDir(), maxBytes)
	h := NewHandler(svc)
	r := gin.New()
	h.RegisterRoutes(r.Group("/media"))
	return r, &fakeJWT{}, repo
}

func tokenFor(t *testing.T, jwt *fakeJWT, userID uuid.UUID) string {
	t.Helper()
	tok, err := jwt.Sign(userID, "u@example.com")
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return tok
}

// fakeJWT stands in for the removed *auth.JWTManager now that the
// middleware no longer parses a bearer token — every request in this
// single-user deployment resolves to auth.DefaultUserID regardless of the
// token's contents. Kept only so call sites threading a "jwt" through
// tokenFor/authedRequest don't need touching one by one.
type fakeJWT struct{}

func (fakeJWT) Sign(uuid.UUID, string) (string, error) { return "test-token", nil }

func multipartImage(t *testing.T, field, filename string, data []byte) (*bytes.Buffer, string) {
	t.Helper()
	buf := &bytes.Buffer{}
	w := multipart.NewWriter(buf)
	fw, err := w.CreateFormFile(field, filename)
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := fw.Write(data); err != nil {
		t.Fatalf("write: %v", err)
	}
	_ = w.Close()
	return buf, w.FormDataContentType()
}

func TestUploadRequiresFileField(t *testing.T) {
	r, jwt, _ := setupRouter(t)
	buf := &bytes.Buffer{}
	w := multipart.NewWriter(buf)
	_ = w.WriteField("other", "x")
	_ = w.Close()
	req := httptest.NewRequest(http.MethodPost, "/media/images", buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, uuid.New()))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want 422", rec.Code)
	}
	var resp map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["code"] != "VALIDATION_ERROR" {
		t.Errorf("code = %q, want VALIDATION_ERROR", resp["code"])
	}
}

func TestUploadResponseShape(t *testing.T) {
	r, jwt, _ := setupRouter(t)
	body, ct := multipartImage(t, "file", "apple.png", pngBytes())
	req := httptest.NewRequest(http.MethodPost, "/media/images", body)
	req.Header.Set("Content-Type", ct)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, uuid.New()))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201: %s", rec.Code, rec.Body.String())
	}
	var resp mediaResp
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.ID == "" {
		t.Error("missing id")
	}
	if resp.URL != "/api/v1/media/"+resp.ID {
		t.Errorf("url = %q", resp.URL)
	}
	if resp.Kind != "image" || resp.ContentType != "image/png" {
		t.Errorf("kind/contentType wrong: %+v", resp)
	}
	if resp.OriginalFilename != "apple.png" {
		t.Errorf("original filename = %q", resp.OriginalFilename)
	}
	// storage_path must never be exposed
	if bytes.Contains(rec.Body.Bytes(), []byte("storage")) {
		t.Error("response leaks storage path")
	}
}

func TestUploadOverLimitReturns413(t *testing.T) {
	const maxBytes = 1024
	r, jwt, _ := setupRouterWithMax(t, maxBytes)
	// Payload well beyond the configured limit; MaxBytesReader must reject it
	// before the whole body is buffered into memory.
	body, ct := multipartImage(t, "file", "big.png", bytes.Repeat([]byte{0x41}, maxBytes*4))
	req := httptest.NewRequest(http.MethodPost, "/media/images", body)
	req.Header.Set("Content-Type", ct)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, uuid.New()))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want 413: %s", rec.Code, rec.Body.String())
	}
	var resp map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["code"] != "MEDIA_TOO_LARGE" {
		t.Errorf("code = %q, want MEDIA_TOO_LARGE", resp["code"])
	}
}

func uploadOne(t *testing.T, r *gin.Engine, jwt *fakeJWT, userID uuid.UUID) mediaResp {
	t.Helper()
	body, ct := multipartImage(t, "file", "a.png", pngBytes())
	req := httptest.NewRequest(http.MethodPost, "/media/images", body)
	req.Header.Set("Content-Type", ct)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("upload status = %d: %s", rec.Code, rec.Body.String())
	}
	var resp mediaResp
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return resp
}

func TestGetWritesRawBytesAndContentType(t *testing.T) {
	r, jwt, _ := setupRouter(t)
	userID := uuid.New()
	m := uploadOne(t, r, jwt, userID)

	req := httptest.NewRequest(http.MethodGet, "/media/"+m.ID, nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
		t.Errorf("content type = %q", ct)
	}
	if !bytes.Equal(rec.Body.Bytes(), pngBytes()) {
		t.Error("body bytes do not match uploaded image")
	}
}

func TestDeleteReturns204(t *testing.T) {
	r, jwt, _ := setupRouter(t)
	userID := uuid.New()
	m := uploadOne(t, r, jwt, userID)
	req := httptest.NewRequest(http.MethodDelete, "/media/"+m.ID, nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
}

func TestDeleteInUseMapsTo409(t *testing.T) {
	r, jwt, repo := setupRouter(t)
	userID := uuid.New()
	m := uploadOne(t, r, jwt, userID)
	repo.refCounts[m.URL] = 1
	req := httptest.NewRequest(http.MethodDelete, "/media/"+m.ID, nil)
	req.Header.Set("Authorization", "Bearer "+tokenFor(t, jwt, userID))
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rec.Code)
	}
	var resp map[string]string
	_ = json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["code"] != "MEDIA_IN_USE" {
		t.Errorf("code = %q, want MEDIA_IN_USE", resp["code"])
	}
}
