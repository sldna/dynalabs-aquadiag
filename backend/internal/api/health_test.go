package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"aquadiag/backend/internal/ai"
	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/diagnosis"
	"aquadiag/backend/internal/models"
	"aquadiag/backend/internal/rules"
)

// assertResponseSchema verifies that the top-level keys of the /v1/diagnose response
// exactly match the stabilized contract: status, top_diagnosis, diagnoses, matched_rules, meta.
func assertResponseSchema(t *testing.T, body []byte) {
	t.Helper()
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		t.Fatalf("response not JSON: %v body=%s", err, string(body))
	}
	required := []string{"status", "top_diagnosis", "diagnoses", "matched_rules", "excluded_rules", "meta"}
	for _, k := range required {
		if _, ok := raw[k]; !ok {
			t.Fatalf("missing required top-level key %q in response: %s", k, string(body))
		}
	}
	var meta map[string]json.RawMessage
	if err := json.Unmarshal(raw["meta"], &meta); err != nil {
		t.Fatalf("meta not JSON object: %v", err)
	}
	for _, k := range []string{"rule_engine_version", "evaluated_rules", "matched_count", "generated_at"} {
		if _, ok := meta[k]; !ok {
			t.Fatalf("missing required meta key %q: %s", k, string(raw["meta"]))
		}
	}
}

// assertStableMeta verifies that the meta block matches the stabilized contract:
// rule_engine_version "1", evaluated_rules > 0, matched_count == want, generated_at parseable as RFC3339.
func assertStableMeta(t *testing.T, m models.DiagnosisMeta, wantMatched int) {
	t.Helper()
	if m.RuleEngineVersion != "1" {
		t.Fatalf("rule_engine_version=%q want %q", m.RuleEngineVersion, "1")
	}
	if m.EvaluatedRules <= 0 {
		t.Fatalf("evaluated_rules=%d (must be > 0)", m.EvaluatedRules)
	}
	if m.MatchedCount != wantMatched {
		t.Fatalf("matched_count=%d want %d", m.MatchedCount, wantMatched)
	}
	if m.GeneratedAt == "" {
		t.Fatal("generated_at empty")
	}
	if _, err := time.Parse(time.RFC3339, m.GeneratedAt); err != nil {
		t.Fatalf("generated_at=%q is not RFC3339: %v", m.GeneratedAt, err)
	}
}

func testRulesFile(t *testing.T) string {
	t.Helper()
	return filepath.Clean(filepath.Join("..", "..", "..", "rules", "aquarium-rules.yaml"))
}

func TestHealth_OK(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	NewServer(nil, nil).handleHealth(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var got healthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("json: %v", err)
	}
	if got.Status != "ok" {
		t.Fatalf("status field: want ok, got %q", got.Status)
	}
}

func TestHealth_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/health", nil)
	rec := httptest.NewRecorder()

	NewServer(nil, nil).handleHealth(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status=%d", rec.Code)
	}
}

func TestDiagnose_MatchedResponse_NitriteRule(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	nitrite := 0.5
	body, _ := json.Marshal(map[string]any{
		"tank": map[string]any{"name": "Test", "volume_liters": 100},
		"water": map[string]any{
			"nitrite_mg_l": nitrite,
		},
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	// Schema-Stabilität: top-level Felder müssen alle anwesend sein.
	assertResponseSchema(t, rec.Body.Bytes())

	var resp models.DiagnoseAPIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Status != models.StatusMatched {
		t.Fatalf("status=%q want %q", resp.Status, models.StatusMatched)
	}
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.RuleID != "nitrite_poisoning_v1" {
		t.Fatalf("top_diagnosis=%+v", resp.TopDiagnosis)
	}
	if len(resp.Diagnoses) == 0 || resp.Diagnoses[0].RuleID != resp.TopDiagnosis.RuleID {
		t.Fatal("top_diagnosis must equal diagnoses[0]")
	}
	if resp.Diagnoses[0].DiagnosisType != "nitrite_poisoning" {
		t.Fatalf("diagnosis_type=%q", resp.Diagnoses[0].DiagnosisType)
	}
	if len(resp.MatchedRules) == 0 || resp.MatchedRules[0] != "nitrite_poisoning_v1" {
		t.Fatalf("matched_rules=%v", resp.MatchedRules)
	}
	assertStableMeta(t, resp.Meta, len(resp.Diagnoses))
	if resp.Meta.DiagnosisID == 0 || resp.Meta.WaterTestID == 0 || resp.Meta.TankID == 0 {
		t.Fatalf("persistence ids missing in meta: %+v", resp.Meta)
	}
}

func TestDiagnose_CO2MgL_MatchesCo2PhKhRiskV1(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "co2.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	body, _ := json.Marshal(map[string]any{
		"tank":     map[string]any{"name": "C", "volume_liters": 80},
		"water":    map[string]any{"co2_mg_l": 30.0},
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	assertResponseSchema(t, rec.Body.Bytes())

	var resp models.DiagnoseAPIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Status != models.StatusMatched {
		t.Fatalf("status=%q", resp.Status)
	}
	if len(resp.Diagnoses) != 1 || resp.Diagnoses[0].RuleID != "co2_overdose_v1" {
		t.Fatalf("diagnoses=%v", resp.Diagnoses)
	}
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.RuleID != "co2_overdose_v1" {
		t.Fatal(resp.TopDiagnosis)
	}
	if !slices.Equal(resp.MatchedRules, []string{"co2_overdose_v1"}) {
		t.Fatalf("matched_rules=%v", resp.MatchedRules)
	}
	assertStableMeta(t, resp.Meta, 1)
}

func TestDiagnose_FlatCO2MgL_Gte30_MatchesCo2PhKhRiskV1(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "co2-flat.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	// Create a tank and reference it via tank_id (flat water input at top-level).
	tx, err := sqlDB.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback() }()
	tankID, err := db.InsertTank(context.Background(), tx, "Flat CO2", 120)
	if err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	body, _ := json.Marshal(map[string]any{
		"tank_id":  tankID,
		"co2_mg_l": 30.0,
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	assertResponseSchema(t, rec.Body.Bytes())

	var resp models.DiagnoseAPIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Status != models.StatusMatched {
		t.Fatalf("status=%q", resp.Status)
	}
	if len(resp.Diagnoses) == 0 {
		t.Fatalf("diagnoses=%v", resp.Diagnoses)
	}
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.RuleID != "co2_overdose_v1" {
		t.Fatalf("top_diagnosis=%+v diagnoses=%v", resp.TopDiagnosis, resp.Diagnoses)
	}
}

func TestDiagnose_FlatCO2MgL_29_9_DoesNotMatchCo2PhKhRiskV1(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "co2-flat-29_9.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	tx, err := sqlDB.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback() }()
	tankID, err := db.InsertTank(context.Background(), tx, "Flat CO2 29.9", 120)
	if err != nil {
		t.Fatal(err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatal(err)
	}

	body, _ := json.Marshal(map[string]any{
		"tank_id":  tankID,
		"co2_mg_l": 29.9,
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	assertResponseSchema(t, rec.Body.Bytes())

	var resp models.DiagnoseAPIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}

	// Regardless of overall status, ensure this specific rule did not match.
	for _, d := range resp.Diagnoses {
		if d.RuleID == "co2_overdose_v1" {
			t.Fatalf("co2_overdose_v1 must not match for 29.9, diagnoses=%v", resp.Diagnoses)
		}
	}
}

func TestDiagnose_AIErrorCode_DevelopmentIncluded(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("AI_ENABLED", "true")
	t.Setenv("AI_API_KEY", "") // force missing_api_key

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "ai-err-dev.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	body, _ := json.Marshal(map[string]any{
		"tank":     map[string]any{"name": "AI Dev", "volume_liters": 80},
		"water":    map[string]any{"co2_mg_l": 30.0},
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var raw map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	meta, _ := raw["meta"].(map[string]any)
	if meta == nil {
		t.Fatalf("missing meta: %s", rec.Body.String())
	}
	if meta["ai_error_code"] != "missing_api_key" {
		t.Fatalf("ai_error_code=%v", meta["ai_error_code"])
	}
}

func TestDiagnose_AIErrorCode_ProductionHidden(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("AI_ENABLED", "true")
	t.Setenv("AI_API_KEY", "") // force missing_api_key, but should be hidden in prod

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "ai-err-prod.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	body, _ := json.Marshal(map[string]any{
		"tank":     map[string]any{"name": "AI Prod", "volume_liters": 80},
		"water":    map[string]any{"co2_mg_l": 30.0},
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var raw map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	meta, _ := raw["meta"].(map[string]any)
	if meta == nil {
		t.Fatalf("missing meta: %s", rec.Body.String())
	}
	if _, ok := meta["ai_error_code"]; ok {
		t.Fatalf("ai_error_code must be omitted in production, meta=%v", meta)
	}
}

func TestDiagnose_MultipleMatches_CO2AndMilkyWater_TopHigherConfidence(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "multi.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	body, _ := json.Marshal(map[string]any{
		"tank": map[string]any{"name": "M", "volume_liters": 100},
		"water": map[string]any{
			"co2_mg_l": 30.0,
		},
		"symptoms": []string{"milky_water"},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	assertResponseSchema(t, rec.Body.Bytes())

	var resp models.DiagnoseAPIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Status != models.StatusMatched {
		t.Fatalf("status=%q", resp.Status)
	}
	if len(resp.Diagnoses) != 2 {
		t.Fatalf("want 2 diagnoses, got %v", resp.Diagnoses)
	}
	ids := []string{resp.Diagnoses[0].RuleID, resp.Diagnoses[1].RuleID}
	if !slices.Contains(ids, "bacterial_bloom_v1") || !slices.Contains(ids, "co2_overdose_v1") {
		t.Fatalf("ids=%v", ids)
	}
	if resp.Diagnoses[0].Confidence < resp.Diagnoses[1].Confidence {
		t.Fatalf("diagnoses not sorted by confidence desc: %#v", resp.Diagnoses)
	}
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.RuleID != resp.Diagnoses[0].RuleID {
		t.Fatal("top_diagnosis must be diagnoses[0]")
	}
	if resp.TopDiagnosis.RuleID != "bacterial_bloom_v1" {
		t.Fatalf("expected bacterial_bloom on top (higher confidence), got %q", resp.TopDiagnosis.RuleID)
	}
	wantRules := []string{"bacterial_bloom_v1", "co2_overdose_v1"}
	if !slices.Equal(resp.MatchedRules, wantRules) {
		t.Fatalf("matched_rules=%v want %v", resp.MatchedRules, wantRules)
	}
	assertStableMeta(t, resp.Meta, 2)
}

func TestDiagnose_UnknownResponse_NoRuleMatch(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "unk.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	note := "nur Notiz"
	body, _ := json.Marshal(map[string]any{
		"tank": map[string]any{"name": "T3", "volume_liters": 50},
		"water": map[string]any{
			"notes": note,
		},
		"symptoms": []string{},
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	assertResponseSchema(t, rec.Body.Bytes())

	var resp models.DiagnoseAPIResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Status != models.StatusUnknown {
		t.Fatalf("status=%q", resp.Status)
	}
	if resp.TopDiagnosis != nil {
		t.Fatalf("top_diagnosis=%v want nil", resp.TopDiagnosis)
	}
	if resp.Diagnoses == nil || len(resp.Diagnoses) != 0 {
		t.Fatalf("diagnoses must be [] (not null), got %#v", resp.Diagnoses)
	}
	if resp.MatchedRules == nil || len(resp.MatchedRules) != 0 {
		t.Fatalf("matched_rules must be [] (not null), got %#v", resp.MatchedRules)
	}
	assertStableMeta(t, resp.Meta, 0)
	if resp.Meta.WaterTestID == 0 || resp.Meta.TankID == 0 {
		t.Fatalf("persistence ids missing in meta: %+v", resp.Meta)
	}

	// Bei status=unknown sollen diagnoses und matched_rules als JSON-Arrays serialisiert sein,
	// nicht als null. Roh-JSON prüfen, weil json.Unmarshal beides toleriert.
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &raw); err != nil {
		t.Fatal(err)
	}
	if string(raw["diagnoses"]) != "[]" {
		t.Fatalf("diagnoses raw=%s want []", raw["diagnoses"])
	}
	if string(raw["matched_rules"]) != "[]" {
		t.Fatalf("matched_rules raw=%s want []", raw["matched_rules"])
	}
	if string(raw["top_diagnosis"]) != "null" {
		t.Fatalf("top_diagnosis raw=%s want null", raw["top_diagnosis"])
	}
}

func TestDiagnose_ValidationFailed_StructuredJSON(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "val.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	body := []byte(`{"water":{"ph":7.0},"symptoms":[]}`)

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}

	var apiErr models.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &apiErr); err != nil {
		t.Fatal(err)
	}
	if apiErr.Code != "validation_failed" {
		t.Fatalf("code=%q", apiErr.Code)
	}
	if len(apiErr.Errors) == 0 {
		t.Fatalf("expected errors array, got %#v", apiErr)
	}
	if apiErr.Errors[0].Field == "" || apiErr.Errors[0].Code == "" {
		t.Fatalf("field errors must include field and code: %#v", apiErr.Errors[0])
	}
}

func TestDiagnose_InvalidJSON_StructuredError(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "badjson.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(testRulesFile(t))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	req := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader([]byte(`{"water":`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.handleDiagnose(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status=%d", rec.Code)
	}

	var apiErr models.ErrorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &apiErr); err != nil {
		t.Fatal(err)
	}
	if apiErr.Code != "invalid_json" || len(apiErr.Errors) != 1 {
		t.Fatalf("got %#v", apiErr)
	}
	if apiErr.Errors[0].Field != "body" || apiErr.Errors[0].Code != "invalid_json" {
		t.Fatalf("got %#v", apiErr.Errors[0])
	}
}
