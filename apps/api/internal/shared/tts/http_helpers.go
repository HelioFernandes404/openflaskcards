package tts

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"
)

func decodeSynthesizedPayload(resp *http.Response) (string, error) {
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("tts: read response: %w", err)
	}
	mediaType, _, _ := mime.ParseMediaType(resp.Header.Get("Content-Type"))
	if strings.HasPrefix(mediaType, "audio/") || mediaType == "application/octet-stream" {
		return base64.StdEncoding.EncodeToString(body), nil
	}
	if strings.Contains(mediaType, "json") {
		var payload map[string]any
		if err := json.Unmarshal(body, &payload); err != nil {
			return "", fmt.Errorf("tts: decode response json: %w", err)
		}
		for _, key := range []string{"audioBase64", "audio", "ttsAudio", "audioUrl", "url"} {
			if value, ok := payload[key].(string); ok && strings.TrimSpace(value) != "" {
				return value, nil
			}
		}
		return "", fmt.Errorf("tts: response json missing audio payload")
	}
	trimmed := strings.TrimSpace(string(bytes.TrimSpace(body)))
	if trimmed == "" {
		return "", fmt.Errorf("tts: empty response body")
	}
	return trimmed, nil
}

func errorFromResponse(resp *http.Response) error {
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<10))
	if err != nil {
		return fmt.Errorf("tts: read error body: %w", err)
	}
	detail := strings.TrimSpace(string(body))
	var underlying error
	if detail == "" {
		underlying = fmt.Errorf("tts: upstream returned %s", resp.Status)
	} else {
		underlying = fmt.Errorf("tts: upstream returned %s: %s", resp.Status, detail)
	}
	return &upstreamError{statusCode: resp.StatusCode, err: underlying}
}
