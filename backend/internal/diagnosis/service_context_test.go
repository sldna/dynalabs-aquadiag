package diagnosis

import (
	"context"
	"path/filepath"
	"testing"

	"aquadiag/backend/internal/ai"
	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
	"aquadiag/backend/internal/rules"
)

func TestValidateDiagnoseRequest_ContextTankAgeNegative(t *testing.T) {
	req := models.DiagnoseRequest{
		Tank:     &models.InlineTank{Name: "T", VolumeLiters: 100},
		Water:    models.WaterTestInput{},
		Symptoms: []string{"green_water"},
		Context: &models.DiagnosisContext{
			TankAgeDays: intPtr(-1),
		},
	}
	if err := validateDiagnoseRequest(req); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateDiagnoseRequest_ContextTankAgeTooLarge(t *testing.T) {
	req := models.DiagnoseRequest{
		Tank:     &models.InlineTank{Name: "T", VolumeLiters: 100},
		Water:    models.WaterTestInput{},
		Symptoms: []string{"green_water"},
		Context: &models.DiagnosisContext{
			TankAgeDays: intPtr(400000),
		},
	}
	if err := validateDiagnoseRequest(req); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestDiagnose_BackwardCompatible_NoContext(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	rs, err := rules.LoadFile(filepath.Clean(filepath.Join("..", "..", "..", "rules", "aquarium-rules.yaml")))
	if err != nil {
		t.Fatal(err)
	}

	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "dc.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	n := 0.5
	req := models.DiagnoseRequest{
		Tank: &models.InlineTank{Name: "T", VolumeLiters: 80},
		Water: models.WaterTestInput{
			NitriteMgL: &n,
		},
		Symptoms: []string{},
	}

	svc := NewService(sqlDB, rs, ai.NewServiceFromEnv())
	resp, err := svc.Diagnose(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.Status != models.StatusMatched {
		t.Fatalf("status=%q", resp.Status)
	}
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.RuleID != "nitrite_risk_v1" {
		t.Fatalf("got %+v", resp.TopDiagnosis)
	}
	if resp.ConsideredContext != nil {
		t.Fatalf("expected no considered_context, got %+v", resp.ConsideredContext)
	}
}

func TestDiagnose_ConsideredContextEcho_FilterCleaningMatchesBiofilterRule(t *testing.T) {
	t.Setenv("AI_ENABLED", "false")

	rs, err := rules.LoadFile(filepath.Clean(filepath.Join("..", "..", "..", "rules", "aquarium-rules.yaml")))
	if err != nil {
		t.Fatal(err)
	}

	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "dc2.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}

	n := 0.5
	truev := true
	req := models.DiagnoseRequest{
		Tank: &models.InlineTank{Name: "T", VolumeLiters: 80},
		Water: models.WaterTestInput{
			NitriteMgL: &n,
		},
		Symptoms: []string{},
		Context: &models.DiagnosisContext{
			RecentFilterCleaning: &truev,
		},
	}

	svc := NewService(sqlDB, rs, ai.NewServiceFromEnv())
	resp, err := svc.Diagnose(context.Background(), req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.TopDiagnosis == nil || resp.TopDiagnosis.RuleID != "nitrite_risk_biofilter_disturbance_v1" {
		t.Fatalf("want biofilter rule on top, got %+v", resp.TopDiagnosis)
	}
	if resp.TopDiagnosis.Confidence < 0.93 {
		t.Fatalf("confidence=%v", resp.TopDiagnosis.Confidence)
	}
	if resp.ConsideredContext == nil || resp.ConsideredContext.RecentFilterCleaning == nil || !*resp.ConsideredContext.RecentFilterCleaning {
		t.Fatalf("considered_context=%+v", resp.ConsideredContext)
	}
}

func intPtr(v int) *int {
	return &v
}
