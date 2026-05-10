package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
)

func testMux(t *testing.T, srv *Server) http.Handler {
	t.Helper()
	mux := http.NewServeMux()
	RegisterRoutes(mux, srv)
	return mux
}

func TestTanks_ListCreate_Update_Delete(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "tanks.db")

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

	t.Run("GET empty list", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/tanks", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
		}
		var out struct {
			Tanks []any `json:"tanks"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		if len(out.Tanks) != 0 {
			t.Fatalf("want empty tanks")
		}
	})

	var tankID int64
	t.Run("POST create", func(t *testing.T) {
		body := []byte(`{"name":"Becken A","volume_liters":120}`)
		req := httptest.NewRequest(http.MethodPost, "/v1/tanks", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
		}
		var tank map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &tank); err != nil {
			t.Fatal(err)
		}
		if tank["name"] != "Becken A" {
			t.Fatalf("tank=%v", tank)
		}
		idf, ok := tank["id"].(float64)
		if !ok {
			t.Fatalf("id type %T", tank["id"])
		}
		tankID = int64(idf)
	})

	t.Run("GET one by id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/tanks/"+strconv.FormatInt(tankID, 10), nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatal(rec.Body.String())
		}
		var tank map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &tank); err != nil {
			t.Fatal(err)
		}
		if tank["volume_liters"].(float64) != 120 {
			t.Fatalf("%v", tank)
		}
	})

	t.Run("PUT update name volume notes", func(t *testing.T) {
		body := []byte(`{"name":"Becken B","volume_liters":200,"notes":"Mit LEDs"}`)
		req := httptest.NewRequest(http.MethodPut, "/v1/tanks/"+strconv.FormatInt(tankID, 10), bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
		}
		var tank map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &tank); err != nil {
			t.Fatal(err)
		}
		if tank["name"] != "Becken B" || tank["volume_liters"].(float64) != 200 {
			t.Fatalf("%v", tank)
		}
		if tank["notes"] != "Mit LEDs" {
			t.Fatalf("notes=%v", tank["notes"])
		}
	})

	t.Run("DELETE tank", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/v1/tanks/"+strconv.FormatInt(tankID, 10), nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
		}
		req2 := httptest.NewRequest(http.MethodGet, "/v1/tanks/"+strconv.FormatInt(tankID, 10), nil)
		rec2 := httptest.NewRecorder()
		h.ServeHTTP(rec2, req2)
		if rec2.Code != http.StatusNotFound {
			t.Fatalf("want 404 got %d %s", rec2.Code, rec2.Body.String())
		}
	})

	t.Run("invalid tank id returns structured error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/tanks/xyz", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusBadRequest {
			t.Fatalf("status=%d", rec.Code)
		}
		var apiErr models.ErrorResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &apiErr); err != nil {
			t.Fatal(err)
		}
		if apiErr.Code != "invalid_path" || len(apiErr.Errors) != 1 {
			t.Fatalf("%+v", apiErr)
		}
	})
}

func TestTanks_ListIncludesLightweightSummary(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "tank-summary.db")

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

	summaryTankID, err := db.InsertTank(ctx, sqlDB, "Summary", 120)
	if err != nil {
		t.Fatal(err)
	}
	emptyTankID, err := db.InsertTank(ctx, sqlDB, "Empty", 80)
	if err != nil {
		t.Fatal(err)
	}

	ph := 7.2
	wt1, err := db.InsertWaterTest(ctx, sqlDB, summaryTankID, models.WaterTestInput{PH: &ph}, []string{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	wt2, err := db.InsertWaterTest(ctx, sqlDB, summaryTankID, models.WaterTestInput{}, []string{"gasping"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.InsertDiagnosisResult(ctx, sqlDB, models.DiagnosisResultRow{
		WaterTestID:         wt1,
		DiagnosisType:       "ph_shift",
		Confidence:          0.4,
		Severity:            "medium",
		ActionsNowJSON:      "[]",
		ActionsOptionalJSON: "[]",
		AvoidJSON:           "[]",
		FactsJSON:           "[]",
		MatchedRuleIDsJSON:  "[]",
		RunnerUpJSON:        "[]",
		ExplanationJSON:     `{"summary":"","reasoning_public":"","actions_now":[],"actions_optional":[],"avoid":[],"follow_up_questions":[],"safety_note":"","source":"deterministic"}`,
	}); err != nil {
		t.Fatal(err)
	}
	if _, err := db.InsertDiagnosisResult(ctx, sqlDB, models.DiagnosisResultRow{
		WaterTestID:         wt2,
		DiagnosisType:       "oxygen_low",
		Confidence:          0.82,
		Severity:            "high",
		ActionsNowJSON:      "[]",
		ActionsOptionalJSON: "[]",
		AvoidJSON:           "[]",
		FactsJSON:           "[]",
		MatchedRuleIDsJSON:  "[]",
		RunnerUpJSON:        "[]",
		ExplanationJSON:     `{"summary":"","reasoning_public":"","actions_now":[],"actions_optional":[],"avoid":[],"follow_up_questions":[],"safety_note":"","source":"deterministic"}`,
	}); err != nil {
		t.Fatal(err)
	}

	var latestWaterTestAt string
	if err := sqlDB.QueryRowContext(ctx, `SELECT created_at FROM water_tests WHERE id = ?`, wt2).Scan(&latestWaterTestAt); err != nil {
		t.Fatal(err)
	}
	latestWaterTestAt = strings.Replace(latestWaterTestAt, " ", "T", 1) + "Z"

	req := httptest.NewRequest(http.MethodGet, "/v1/tanks", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d %s", rec.Code, rec.Body.String())
	}

	var out struct {
		Tanks []map[string]any `json:"tanks"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}

	byID := map[int64]map[string]any{}
	for _, tank := range out.Tanks {
		id, ok := tank["id"].(float64)
		if !ok {
			t.Fatalf("tank id type %T", tank["id"])
		}
		byID[int64(id)] = tank
	}

	summaryTank := byID[summaryTankID]
	if summaryTank == nil {
		t.Fatalf("summary tank missing: %+v", out.Tanks)
	}
	if summaryTank["last_water_test_at"] != latestWaterTestAt {
		t.Fatalf("last_water_test_at=%v want %s", summaryTank["last_water_test_at"], latestWaterTestAt)
	}
	if summaryTank["latest_diagnosis_type"] != "oxygen_low" {
		t.Fatalf("latest_diagnosis_type=%v", summaryTank["latest_diagnosis_type"])
	}
	if summaryTank["latest_diagnosis_severity"] != "high" {
		t.Fatalf("latest_diagnosis_severity=%v", summaryTank["latest_diagnosis_severity"])
	}
	if summaryTank["latest_diagnosis_confidence"] != 0.82 {
		t.Fatalf("latest_diagnosis_confidence=%v", summaryTank["latest_diagnosis_confidence"])
	}
	if _, ok := summaryTank["diagnoses"]; ok {
		t.Fatalf("tank list must not include full diagnoses payload: %+v", summaryTank)
	}

	emptyTank := byID[emptyTankID]
	if emptyTank == nil {
		t.Fatalf("empty tank missing: %+v", out.Tanks)
	}
	for _, key := range []string{
		"last_water_test_at",
		"latest_diagnosis_type",
		"latest_diagnosis_severity",
		"latest_diagnosis_confidence",
	} {
		if _, ok := emptyTank[key]; ok {
			t.Fatalf("%s should be omitted for tank without summary: %+v", key, emptyTank)
		}
	}
}

func TestWaterTests_List_Delete_Order(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "wt.db")

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
	tankID, err := db.InsertTank(ctx, sqlDB, "T", 80)
	if err != nil {
		t.Fatal(err)
	}

	n := 7.0
	wt1, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{PH: &n}, []string{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	wt2, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{}, []string{"algae"}, nil)
	if err != nil {
		t.Fatal(err)
	}

	t.Run("GET list newest first", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/tanks/"+strconv.FormatInt(tankID, 10)+"/water-tests", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s", rec.Body.String())
		}
		var out struct {
			Tests []models.WaterTestRecord `json:"water_tests"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		if len(out.Tests) != 2 {
			t.Fatalf("got %d", len(out.Tests))
		}
		if out.Tests[0].ID != wt2 || out.Tests[1].ID != wt1 {
			t.Fatalf("order want [%d,%d] got [%d,%d]", wt2, wt1, out.Tests[0].ID, out.Tests[1].ID)
		}
	})

	t.Run("GET by id", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/water-tests/"+strconv.FormatInt(wt1, 10), nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatal(rec.Body.String())
		}
		var recRow models.WaterTestRecord
		if err := json.Unmarshal(rec.Body.Bytes(), &recRow); err != nil {
			t.Fatal(err)
		}
		if recRow.ID != wt1 || recRow.PH == nil || *recRow.PH != 7 {
			t.Fatalf("%+v", recRow)
		}
	})

	t.Run("DELETE water test", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/v1/water-tests/"+strconv.FormatInt(wt1, 10), nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("%s", rec.Body.String())
		}
		req2 := httptest.NewRequest(http.MethodGet, "/v1/water-tests/"+strconv.FormatInt(wt1, 10), nil)
		rec2 := httptest.NewRecorder()
		h.ServeHTTP(rec2, req2)
		if rec2.Code != http.StatusNotFound {
			t.Fatalf("got %d", rec2.Code)
		}
	})

	t.Run("unknown tank for water-tests list", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/v1/tanks/99999/water-tests", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("%d %s", rec.Code, rec.Body.String())
		}
	})
}

func TestTankDelete_RemovesWaterTestsAndDiagnosisResults(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "cascade.db")

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
	tankID, err := db.InsertTank(ctx, sqlDB, "Cascade", 100)
	if err != nil {
		t.Fatal(err)
	}
	wtID, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{}, []string{}, nil)
	if err != nil {
		t.Fatal(err)
	}

	row := models.DiagnosisResultRow{
		WaterTestID:         wtID,
		DiagnosisType:       "unknown",
		Confidence:          0,
		Severity:            "low",
		ActionsNowJSON:      "[]",
		ActionsOptionalJSON: "[]",
		AvoidJSON:           "[]",
		FactsJSON:           "[]",
		MatchedRuleIDsJSON:  "[]",
		RunnerUpJSON:        "[]",
		ExplanationJSON:     `{"summary":"","reasoning_public":"","actions_now":[],"actions_optional":[],"avoid":[],"follow_up_questions":[],"safety_note":"","source":"deterministic"}`,
	}
	diagID, err := db.InsertDiagnosisResult(ctx, sqlDB, row)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/v1/tanks/"+strconv.FormatInt(tankID, 10), nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("%s", rec.Body.String())
	}

	var n int
	if err := sqlDB.QueryRowContext(ctx, `SELECT COUNT(1) FROM water_tests WHERE id = ?`, wtID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("water_test still exists")
	}
	if err := sqlDB.QueryRowContext(ctx, `SELECT COUNT(1) FROM diagnosis_results WHERE id = ?`, diagID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("diagnosis_result still exists")
	}
	if err := sqlDB.QueryRowContext(ctx, `SELECT COUNT(1) FROM tanks WHERE id = ?`, tankID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("tank still exists")
	}
}

func TestWaterTestDelete_RemovesDiagnosisResults(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "wt-cascade.db")

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
	tankID, err := db.InsertTank(ctx, sqlDB, "Cascade WT", 60)
	if err != nil {
		t.Fatal(err)
	}
	wtID, err := db.InsertWaterTest(ctx, sqlDB, tankID, models.WaterTestInput{}, []string{}, nil)
	if err != nil {
		t.Fatal(err)
	}

	row := models.DiagnosisResultRow{
		WaterTestID:         wtID,
		DiagnosisType:       "unknown",
		Confidence:          0,
		Severity:            "low",
		ActionsNowJSON:      "[]",
		ActionsOptionalJSON: "[]",
		AvoidJSON:           "[]",
		FactsJSON:           "[]",
		MatchedRuleIDsJSON:  "[]",
		RunnerUpJSON:        "[]",
		ExplanationJSON:     `{"summary":"","reasoning_public":"","actions_now":[],"actions_optional":[],"avoid":[],"follow_up_questions":[],"safety_note":"","source":"deterministic"}`,
	}
	diagID, err := db.InsertDiagnosisResult(ctx, sqlDB, row)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/v1/water-tests/"+strconv.FormatInt(wtID, 10), nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("%d %s", rec.Code, rec.Body.String())
	}

	var n int
	if err := sqlDB.QueryRowContext(ctx, `SELECT COUNT(1) FROM diagnosis_results WHERE id = ?`, diagID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("diagnosis_result still exists")
	}
	if err := sqlDB.QueryRowContext(ctx, `SELECT COUNT(1) FROM water_tests WHERE id = ?`, wtID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("water_test still exists")
	}
}
