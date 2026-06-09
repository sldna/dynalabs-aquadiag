package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/watertestconfig"
)

func loadTestWaterTestConfig(t *testing.T) *watertestconfig.Service {
	t.Helper()
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "config-api.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}
	svc := watertestconfig.NewService(sqlDB)
	if err := svc.SeedDefaultJBLConfigIfEmpty(context.Background()); err != nil {
		t.Fatal(err)
	}
	return svc
}

func TestWaterTestConfig_DELETEVersion(t *testing.T) {
	cfg := loadTestWaterTestConfig(t)
	draft, err := cfg.CreateDraftFromActive(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	srv := NewServer(nil, nil, cfg)
	h := testMux(t, srv)

	req := httptest.NewRequest(http.MethodDelete, "/v1/water-test-config/versions/"+strconv.FormatInt(draft.ID, 10), nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
	}
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
		Tests      []watertestconfig.TestConfig              `json:"tests"`
		Thresholds map[string]watertestconfig.ThresholdGroup `json:"thresholds"`
		Timers     map[string]watertestconfig.TimerGroup     `json:"timers"`
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
