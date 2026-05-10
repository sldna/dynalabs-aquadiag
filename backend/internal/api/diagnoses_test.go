package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"testing"

	"aquadiag/backend/internal/ai"
	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/diagnosis"
	"aquadiag/backend/internal/rules"
)

func TestPatchDiagnosisFollowUps_OK(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	dir := t.TempDir()
	dbPath := filepath.Join(dir, "diag-patch.db")

	sqlDB, err := db.Open(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })

	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	rs, err := rules.LoadFile(filepath.Clean(filepath.Join("..", "..", "..", "rules", "aquarium-rules.yaml")))
	if err != nil {
		t.Fatal(err)
	}

	svc := diagnosis.NewService(sqlDB, rs, ai.NewServiceFromEnv())
	srv := NewServer(sqlDB, svc)

	body, _ := json.Marshal(map[string]any{
		"tank":     map[string]any{"name": "FUP", "volume_liters": 120},
		"water":    map[string]any{"nitrite_mg_l": 0.6},
		"symptoms": []string{},
	})

	recPost := httptest.NewRecorder()
	reqPost := httptest.NewRequest(http.MethodPost, "/v1/diagnose", bytes.NewReader(body))
	reqPost.Header.Set("Content-Type", "application/json")
	srv.handleDiagnose(recPost, reqPost)
	if recPost.Code != http.StatusOK {
		t.Fatalf("diagnose status=%d %s", recPost.Code, recPost.Body.String())
	}

	var postResp struct {
		Meta struct {
			DiagnosisID int64 `json:"diagnosis_id"`
		} `json:"meta"`
	}
	if err := json.Unmarshal(recPost.Body.Bytes(), &postResp); err != nil {
		t.Fatal(err)
	}
	if postResp.Meta.DiagnosisID < 1 {
		t.Fatalf("diagnosis_id=%d", postResp.Meta.DiagnosisID)
	}

	patchBody, _ := json.Marshal(map[string]any{
		"follow_up_answers": map[string]string{"0": "morgens stärker", "1": "ja"},
	})
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPatch,
		"/v1/diagnoses/"+strconv.FormatInt(postResp.Meta.DiagnosisID, 10), bytes.NewReader(patchBody))
	req.Header.Set("Content-Type", "application/json")

	srv.routeV1Diagnoses(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("patch status=%d %s", rec.Code, rec.Body.String())
	}

	var got map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	var answers map[string]string
	if err := json.Unmarshal(got["follow_up_answers"], &answers); err != nil {
		t.Fatal(err)
	}
	if answers["0"] != "morgens stärker" || answers["1"] != "ja" {
		t.Fatalf("answers=%v", answers)
	}
}
