package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"aquadiag/backend/internal/config"
)

func loadTestWaterTestConfig(t *testing.T) *config.WaterTestConfigBundle {
	t.Helper()
	dir, err := config.ResolveConfigDir()
	if err != nil {
		t.Fatal(err)
	}
	bundle, err := config.LoadWaterTestConfig(dir)
	if err != nil {
		t.Fatal(err)
	}
	return bundle
}

func TestWaterTestConfig_GET(t *testing.T) {
	cfg := loadTestWaterTestConfig(t)
	srv := NewServer(nil, nil, cfg)
	h := testMux(t, srv)

	req := httptest.NewRequest(http.MethodGet, "/v1/water-test-config", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
	}

	var out struct {
		Tests      []config.WaterTestProfile            `json:"tests"`
		Thresholds map[string]config.WaterTestThreshold `json:"thresholds"`
		Timers     map[string]config.WaterTestTimer     `json:"timers"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if len(out.Tests) == 0 {
		t.Fatal("expected tests in response")
	}
	if out.Thresholds == nil || len(out.Thresholds) == 0 {
		t.Fatal("expected thresholds in response")
	}
	if out.Timers == nil || len(out.Timers) == 0 {
		t.Fatal("expected timers in response")
	}
}
