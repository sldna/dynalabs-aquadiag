package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"aquadiag/backend/internal/models"
)

func TestExplain_MissingAPIKey_ReturnsMissingAPIKey(t *testing.T) {
	svc := NewService(Config{
		Enabled:        true,
		APIKey:         "",
		BaseURL:        "https://api.openai.com/v1",
		Model:          "gpt-test",
		TimeoutSeconds: 1,
		AppEnv:         "development",
	}, http.DefaultClient)

	_, err := svc.Explain(context.Background(), models.RuleMatch{DiagnosisType: "unknown"}, nil, nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}
	if got := ErrorCodeFrom(err); got != ErrorCodeMissingAPIKey {
		t.Fatalf("code=%q", got)
	}
}

func TestExplain_Non2xx_MapsToProviderError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]any{"error": "boom"})
	}))
	t.Cleanup(ts.Close)

	svc := NewService(Config{
		Enabled:        true,
		APIKey:         "test",
		BaseURL:        ts.URL, // no /chat/completions -> must be appended
		Model:          "gpt-test",
		TimeoutSeconds: 1,
		AppEnv:         "development",
	}, ts.Client())

	_, err := svc.Explain(context.Background(), models.RuleMatch{DiagnosisType: "unknown"}, nil, nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}
	if got := ErrorCodeFrom(err); got != ErrorCodeProviderError {
		t.Fatalf("code=%q err=%v", got, err)
	}
}
