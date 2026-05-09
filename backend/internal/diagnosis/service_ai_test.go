package diagnosis

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"aquadiag/backend/internal/ai"
	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
	"aquadiag/backend/internal/rules"
)

func mustRuleset(t *testing.T) rules.Ruleset {
	t.Helper()
	y := `version: 1
rules:
  - id: nitrite_risk_v1
    name: Nitrit kritisch
    diagnosis_type: nitrite_risk
    severity: critical
    confidence: 0.9
    summary_de: "Nitrit ist erhöht."
    reasoning_de: "Ein erhöhter Nitritwert ist akut belastend."
    follow_up_questions_de: ["Wurde kürzlich gefiltert/umgebaut?"]
    safety_note_de: "Bei akuten Notfällen zusätzlich Fachhilfe einbeziehen."
    when:
      field: nitrite_mg_l
      gte: 0.25
    actions_now: ["Teilwasserwechsel durchführen"]
    actions_optional: ["Fütterung reduzieren"]
    avoid: ["Keine großen Eingriffe ohne Messung"]
    facts: ["Nitrit über Grenzwert"]
`
	rs, err := rules.Parse([]byte(y))
	if err != nil {
		t.Fatal(err)
	}
	return rs
}

func diagnoseReq() models.DiagnoseRequest {
	n := 0.3
	return models.DiagnoseRequest{
		Tank: &models.InlineTank{Name: "Test", VolumeLiters: 100},
		Water: models.WaterTestInput{
			NitriteMgL: &n,
		},
		Symptoms: []string{"milky_water"},
	}
}

func TestDiagnose_AI_Disabled_SkipsAI(t *testing.T) {
	rs := mustRuleset(t)
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	aiSvc := ai.NewService(ai.Config{Enabled: false, TimeoutSeconds: 1}, http.DefaultClient)
	svc := NewService(sqlDB, rs, aiSvc)
	svc.now = func() time.Time { return time.Date(2026, 5, 9, 7, 0, 0, 0, time.UTC) }

	resp, err := svc.Diagnose(context.Background(), diagnoseReq())
	if err != nil {
		t.Fatal(err)
	}
	if resp.AIExplanation != nil {
		t.Fatalf("expected ai_explanation nil, got %+v", resp.AIExplanation)
	}
	if resp.Meta.AIStatus != "disabled" {
		t.Fatalf("ai_status=%q", resp.Meta.AIStatus)
	}
}

func TestDiagnose_AI_Enabled_MockSuccess_AttachesExplanation(t *testing.T) {
	want := models.AIExplanation{
		Summary:           "AI summary",
		ReasoningPublic:   "AI reasoning",
		ActionsNow:        []string{"A"},
		ActionsOptional:   []string{"B"},
		Avoid:             []string{"C"},
		FollowUpQuestions: []string{"Q1"},
		SafetyNote:        "S",
	}

	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]any{
			"choices": []any{
				map[string]any{
					"message": map[string]any{
						"content": mustJSON(t, want),
					},
				},
			},
		}
		_ = json.NewEncoder(w).Encode(resp)
	}))
	t.Cleanup(ts.Close)

	rs := mustRuleset(t)
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	aiSvc := ai.NewService(ai.Config{
		Enabled:        true,
		APIKey:         "test",
		BaseURL:        ts.URL,
		Model:          "test-model",
		TimeoutSeconds: 2,
	}, ts.Client())

	svc := NewService(sqlDB, rs, aiSvc)
	resp, err := svc.Diagnose(context.Background(), diagnoseReq())
	if err != nil {
		t.Fatal(err)
	}
	if resp.Meta.AIStatus != "ok" {
		t.Fatalf("ai_status=%q", resp.Meta.AIStatus)
	}
	if resp.AIExplanation == nil {
		t.Fatal("expected ai_explanation present")
	}
	if resp.AIExplanation.Summary != want.Summary {
		t.Fatalf("summary=%q", resp.AIExplanation.Summary)
	}
	// Deterministic diagnosis must remain the same.
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.DiagnosisType != "nitrite_risk" {
		t.Fatalf("top_diagnosis=%+v", resp.TopDiagnosis)
	}
}

func TestDiagnose_AI_Timeout_FallsBack(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(2 * time.Second)
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{map[string]any{"message": map[string]any{"content": `{"summary":"x","reasoning_public":"y","actions_now":[],"actions_optional":[],"avoid":[],"follow_up_questions":[],"safety_note":"z"}`}}},
		})
	}))
	t.Cleanup(ts.Close)

	rs := mustRuleset(t)
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	aiSvc := ai.NewService(ai.Config{
		Enabled:        true,
		APIKey:         "test",
		BaseURL:        ts.URL,
		Model:          "test-model",
		TimeoutSeconds: 1,
	}, ts.Client())
	svc := NewService(sqlDB, rs, aiSvc)

	resp, err := svc.Diagnose(context.Background(), diagnoseReq())
	if err != nil {
		t.Fatal(err)
	}
	if resp.AIExplanation != nil {
		t.Fatalf("expected ai_explanation nil on timeout, got %+v", resp.AIExplanation)
	}
	if resp.Meta.AIStatus != "failed" {
		t.Fatalf("ai_status=%q", resp.Meta.AIStatus)
	}
}

func TestDiagnose_AI_InvalidJSON_FallsBack(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{map[string]any{"message": map[string]any{"content": `not-json`}}},
		})
	}))
	t.Cleanup(ts.Close)

	rs := mustRuleset(t)
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	aiSvc := ai.NewService(ai.Config{
		Enabled:        true,
		APIKey:         "test",
		BaseURL:        ts.URL,
		Model:          "test-model",
		TimeoutSeconds: 1,
	}, ts.Client())
	svc := NewService(sqlDB, rs, aiSvc)

	resp, err := svc.Diagnose(context.Background(), diagnoseReq())
	if err != nil {
		t.Fatal(err)
	}
	if resp.AIExplanation != nil {
		t.Fatalf("expected ai_explanation nil, got %+v", resp.AIExplanation)
	}
	if resp.Meta.AIStatus != "failed" {
		t.Fatalf("ai_status=%q", resp.Meta.AIStatus)
	}
}

func TestDiagnose_AI_DoesNotModifyDeterministicFields(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{map[string]any{"message": map[string]any{"content": `{"summary":"x","reasoning_public":"y","actions_now":[],"actions_optional":[],"avoid":[],"follow_up_questions":[],"safety_note":"z"}`}}},
		})
	}))
	t.Cleanup(ts.Close)

	rs := mustRuleset(t)
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	disabledSvc := NewService(sqlDB, rs, ai.NewService(ai.Config{Enabled: false, TimeoutSeconds: 1}, http.DefaultClient))
	enabledSvc := NewService(sqlDB, rs, ai.NewService(ai.Config{
		Enabled:        true,
		APIKey:         "test",
		BaseURL:        ts.URL,
		Model:          "test-model",
		TimeoutSeconds: 1,
	}, ts.Client()))

	// Use fresh DB per call to avoid side effects in IDs; compare only deterministic diagnosis parts.
	respDisabled, err := disabledSvc.Diagnose(context.Background(), diagnoseReq())
	if err != nil {
		t.Fatal(err)
	}
	respEnabled, err := enabledSvc.Diagnose(context.Background(), diagnoseReq())
	if err != nil {
		t.Fatal(err)
	}

	// Compare top diagnosis deterministic fields.
	if respDisabled.TopDiagnosis == nil || respEnabled.TopDiagnosis == nil {
		t.Fatalf("top diagnosis missing: disabled=%v enabled=%v", respDisabled.TopDiagnosis, respEnabled.TopDiagnosis)
	}
	if !reflect.DeepEqual(*respDisabled.TopDiagnosis, *respEnabled.TopDiagnosis) {
		t.Fatalf("deterministic top_diagnosis changed: disabled=%+v enabled=%+v", *respDisabled.TopDiagnosis, *respEnabled.TopDiagnosis)
	}
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}
