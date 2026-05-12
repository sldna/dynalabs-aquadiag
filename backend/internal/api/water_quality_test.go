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
	"aquadiag/backend/internal/models"
)

// waterTestPayload is a minimal local mirror of the on-wire response.
// We assert directly on JSON to make sure the field names match what the
// frontend depends on.
type waterTestPayload struct {
	ID                 int64                    `json:"id"`
	WaterQualityStatus string                   `json:"water_quality_status"`
	WaterQualityItems  []map[string]interface{} `json:"water_quality_items"`
}

func setupTanksAndTests(t *testing.T) (http.Handler, int64, []int64) {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "wq.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	srv := NewServer(sqlDB, nil)
	h := testMux(t, srv)

	ctx := context.Background()
	tankID, err := db.InsertTank(ctx, sqlDB, "WQ", 100)
	if err != nil {
		t.Fatal(err)
	}

	ph := 7.2
	temp := 25.0
	wt1, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{PH: &ph, TempC: &temp}, []string{})
	if err != nil {
		t.Fatal(err)
	}

	no2 := 0.4
	wt2, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{NitriteMgL: &no2}, []string{})
	if err != nil {
		t.Fatal(err)
	}

	wt3, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{}, []string{"algae"})
	if err != nil {
		t.Fatal(err)
	}

	return h, tankID, []int64{wt1, wt2, wt3}
}

func TestWaterTestDetail_IncludesWaterQualityFields(t *testing.T) {
	h, _, ids := setupTanksAndTests(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/water-tests/"+strconv.FormatInt(ids[1], 10), nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var out waterTestPayload
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.WaterQualityStatus != "red" {
		t.Fatalf("status=%q want red (no2=0.4)", out.WaterQualityStatus)
	}
	if len(out.WaterQualityItems) != 1 {
		t.Fatalf("items=%d want 1; body=%s", len(out.WaterQualityItems), rec.Body.String())
	}
	if out.WaterQualityItems[0]["key"] != "no2" {
		t.Fatalf("item key=%v want no2", out.WaterQualityItems[0]["key"])
	}
	if out.WaterQualityItems[0]["status"] != "red" {
		t.Fatalf("item status=%v want red", out.WaterQualityItems[0]["status"])
	}
}

func TestWaterTestDetail_UnknownWhenEmpty(t *testing.T) {
	h, _, ids := setupTanksAndTests(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/water-tests/"+strconv.FormatInt(ids[2], 10), nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	var out waterTestPayload
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.WaterQualityStatus != "unknown" {
		t.Fatalf("status=%q want unknown", out.WaterQualityStatus)
	}
	if out.WaterQualityItems == nil {
		t.Fatalf("items must be empty array, not null")
	}
	if len(out.WaterQualityItems) != 0 {
		t.Fatalf("items=%d want 0", len(out.WaterQualityItems))
	}
}

func TestTankWaterTestsList_IncludesAssessmentPerItem(t *testing.T) {
	h, tankID, _ := setupTanksAndTests(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var out struct {
		WaterTests []waterTestPayload `json:"water_tests"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if len(out.WaterTests) != 3 {
		t.Fatalf("count=%d want 3", len(out.WaterTests))
	}
	for _, wt := range out.WaterTests {
		if wt.WaterQualityStatus == "" {
			t.Fatalf("empty status for id=%d body=%s", wt.ID, rec.Body.String())
		}
		if wt.WaterQualityItems == nil {
			t.Fatalf("nil items for id=%d (must be []), body=%s", wt.ID, rec.Body.String())
		}
	}
}
