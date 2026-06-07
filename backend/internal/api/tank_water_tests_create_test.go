package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
)

func setupQuickWaterTests(t *testing.T) (*sql.DB, http.Handler) {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "quick-water-tests.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	srv := NewServer(sqlDB, nil, nil)
	return sqlDB, testMux(t, srv)
}

func TestTankWaterTests_CreateWithoutDiagnosis(t *testing.T) {
	sqlDB, h := setupQuickWaterTests(t)
	ctx := context.Background()

	tankID, err := db.InsertTank(ctx, sqlDB, "Quick", 120)
	if err != nil {
		t.Fatal(err)
	}
	otherTankID, err := db.InsertTank(ctx, sqlDB, "Andere", 60)
	if err != nil {
		t.Fatal(err)
	}

	body := []byte(`{"temperature_c":25.1,"ph":7.2,"nitrite_no2":0.05,"nitrate_no3":10.2,"ammonium_nh4":0.1,"phosphate_po4":0.2,"iron_fe":0.03,"notes":"Morgens gemessen"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var created models.WaterTestRecord
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.ID < 1 || created.TankID != tankID {
		t.Fatalf("created=%+v", created)
	}
	if created.TempC == nil || *created.TempC != 25.1 {
		t.Fatalf("temperature not persisted from alias field: %+v", created.TempC)
	}
	if created.NitriteMgL == nil || *created.NitriteMgL != 0.05 {
		t.Fatalf("nitrite not persisted from alias field: %+v", created.NitriteMgL)
	}
	if created.PhosphatePO4 == nil || *created.PhosphatePO4 != 0.2 {
		t.Fatalf("phosphate not persisted: %+v", created.PhosphatePO4)
	}
	if created.IronFe == nil || *created.IronFe != 0.03 {
		t.Fatalf("iron not persisted: %+v", created.IronFe)
	}
	if created.DiagnosisResultID != nil {
		t.Fatalf("diagnosis_result_id must be empty for quick test: %+v", created)
	}
	if created.ConfigSnapshotJSON == nil || created.ThresholdResultsSnapshotJSON == nil {
		t.Fatalf("snapshots must be persisted: %+v", created)
	}

	var diagnosisCount int
	if err := sqlDB.QueryRowContext(ctx, `SELECT COUNT(1) FROM diagnosis_results WHERE water_test_id = ?`, created.ID).Scan(&diagnosisCount); err != nil {
		t.Fatal(err)
	}
	if diagnosisCount != 0 {
		t.Fatalf("diagnosis must not be created automatically, got=%d", diagnosisCount)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", nil)
	listRec := httptest.NewRecorder()
	h.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", listRec.Code, listRec.Body.String())
	}

	var listOut struct {
		WaterTests []models.WaterTestRecord `json:"water_tests"`
	}
	if err := json.Unmarshal(listRec.Body.Bytes(), &listOut); err != nil {
		t.Fatal(err)
	}
	if len(listOut.WaterTests) != 1 || listOut.WaterTests[0].ID != created.ID {
		t.Fatalf("unexpected list payload: %+v", listOut.WaterTests)
	}

	otherListReq := httptest.NewRequest(http.MethodGet, "/v1/tanks/"+strconv.FormatInt(otherTankID, 10)+"/water-tests", nil)
	otherListRec := httptest.NewRecorder()
	h.ServeHTTP(otherListRec, otherListReq)
	if otherListRec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", otherListRec.Code, otherListRec.Body.String())
	}
	var otherOut struct {
		WaterTests []models.WaterTestRecord `json:"water_tests"`
	}
	if err := json.Unmarshal(otherListRec.Body.Bytes(), &otherOut); err != nil {
		t.Fatal(err)
	}
	if len(otherOut.WaterTests) != 0 {
		t.Fatalf("other tank must remain empty, got=%d", len(otherOut.WaterTests))
	}
}

func TestTankWaterTests_CreateReturnsSnapshotThresholds(t *testing.T) {
	sqlDB, h := setupQuickWaterTests(t)
	ctx := context.Background()

	tankID, err := db.InsertTank(ctx, sqlDB, "Quick", 120)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", bytes.NewReader([]byte(`{"nitrate_no3":0.5}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var out struct {
		ThresholdSource   string           `json:"threshold_source"`
		WaterQualityItems []map[string]any `json:"water_quality_items"`
		ConfigVersionName *string          `json:"config_version_name"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out.ThresholdSource != "snapshot" {
		t.Fatalf("threshold_source=%q body=%s", out.ThresholdSource, rec.Body.String())
	}
	if out.ConfigVersionName == nil || *out.ConfigVersionName != "JBL Freshwater Default v1" {
		t.Fatalf("config_version_name=%v", out.ConfigVersionName)
	}
	if len(out.WaterQualityItems) != 1 || out.WaterQualityItems[0]["threshold_status"] != "ok" {
		t.Fatalf("unexpected items: %+v body=%s", out.WaterQualityItems, rec.Body.String())
	}
}

func TestTankWaterTests_CreateRejectsEmptyMeasurement(t *testing.T) {
	sqlDB, h := setupQuickWaterTests(t)
	ctx := context.Background()

	tankID, err := db.InsertTank(ctx, sqlDB, "Quick", 120)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", bytes.NewReader([]byte(`{"notes":"nur notiz"}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var apiErr models.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &apiErr); err != nil {
		t.Fatal(err)
	}
	if apiErr.Code != "validation_failed" {
		t.Fatalf("code=%s body=%s", apiErr.Code, rec.Body.String())
	}
}

func TestTankWaterTests_CreateRejectsNegativeValues(t *testing.T) {
	sqlDB, h := setupQuickWaterTests(t)
	ctx := context.Background()

	tankID, err := db.InsertTank(ctx, sqlDB, "Quick", 120)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", bytes.NewReader([]byte(`{"water":{"nitrite_mg_l":-0.1}}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var apiErr models.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &apiErr); err != nil {
		t.Fatal(err)
	}
	if apiErr.Code != "validation_failed" {
		t.Fatalf("code=%s body=%s", apiErr.Code, rec.Body.String())
	}
	if len(apiErr.Errors) == 0 || apiErr.Errors[0].Field != "water.nitrite_mg_l" {
		t.Fatalf("errors=%+v", apiErr.Errors)
	}
}
