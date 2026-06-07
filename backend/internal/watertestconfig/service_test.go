package watertestconfig

import (
	"context"
	"path/filepath"
	"testing"

	"aquadiag/backend/internal/db"
	"aquadiag/backend/internal/models"
)

func setupService(t *testing.T) (*Service, context.Context) {
	t.Helper()
	sqlDB, err := db.Open(filepath.Join(t.TempDir(), "config.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = sqlDB.Close() })
	if err := db.Migrate(sqlDB); err != nil {
		t.Fatal(err)
	}
	svc := NewService(sqlDB)
	ctx := context.Background()
	if err := svc.SeedDefaultJBLConfigIfEmpty(ctx); err != nil {
		t.Fatal(err)
	}
	return svc, ctx
}

func TestSeedDefaultJBLConfigIfEmptyCreatesOneActiveVersion(t *testing.T) {
	svc, ctx := setupService(t)
	versions, err := svc.ListConfigVersions(ctx)
	if err != nil {
		t.Fatal(err)
	}
	active := 0
	for _, v := range versions {
		if v.IsActive {
			active++
		}
	}
	if active != 1 {
		t.Fatalf("active versions=%d want 1", active)
	}
	cfg, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(cfg.Tests) == 0 || len(cfg.Timers) == 0 {
		t.Fatalf("expected tests and timers, got tests=%d timers=%d", len(cfg.Tests), len(cfg.Timers))
	}
}

func TestInitialSnapshotEvaluatesNO3HalfMgLOk(t *testing.T) {
	svc, ctx := setupService(t)
	active, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	snapshot, err := svc.BuildConfigSnapshot(ctx, active.ID)
	if err != nil {
		t.Fatal(err)
	}
	res := EvaluateThresholdFromSnapshot(snapshot, "nitrate_no3", 0.5)
	if res.Status != StatusOK {
		t.Fatalf("NO3 0.5 status=%q want ok", res.Status)
	}
}

func TestDraftCanBeUpdatedAndActivated(t *testing.T) {
	svc, ctx := setupService(t)
	oldActive, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !draft.IsDraft || draft.IsActive {
		t.Fatalf("draft flags: %+v", draft.ConfigVersion)
	}
	draft.Tests[0].Label = "Temperatur neu"
	updated, err := svc.UpdateDraftConfig(ctx, draft.ID, ConfigUpdatePayload{Tests: draft.Tests})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Tests[0].Label != "Temperatur neu" {
		t.Fatalf("label not updated: %q", updated.Tests[0].Label)
	}
	activated, err := svc.ActivateConfigVersion(ctx, draft.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !activated.IsActive || activated.IsDraft {
		t.Fatalf("activated flags: %+v", activated.ConfigVersion)
	}
	reloadedOld, err := svc.GetConfigVersion(ctx, oldActive.ID)
	if err != nil {
		t.Fatal(err)
	}
	if reloadedOld.IsActive {
		t.Fatal("old active version must be deactivated")
	}
}

func TestActiveVersionCannotBeUpdatedDirectly(t *testing.T) {
	svc, ctx := setupService(t)
	active, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	_, err = svc.UpdateDraftConfig(ctx, active.ID, ConfigUpdatePayload{Tests: active.Tests})
	if err == nil {
		t.Fatal("expected readonly error")
	}
}

func TestValidateRejectsInvalidTimerStatusAndOverlap(t *testing.T) {
	svc, ctx := setupService(t)
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	draft.Tests[0].Timers = []TimerStep{{StepLabel: "kaputt", DurationSeconds: 0}}
	draft.Tests[0].Thresholds = []Threshold{
		{MinValue: floatPtr(0), MaxValue: floatPtr(10), Status: StatusOK, Message: "ok", SortOrder: 1},
		{MinValue: floatPtr(5), MaxValue: floatPtr(15), Status: "bad", Message: "bad", SortOrder: 2},
	}
	_, err = svc.UpdateDraftConfig(ctx, draft.ID, ConfigUpdatePayload{Tests: draft.Tests})
	if err == nil {
		t.Fatal("expected validation error")
	}
	res, ok := IsValidationError(err)
	if !ok || len(res.Errors) < 3 {
		t.Fatalf("expected validation issues, got ok=%v res=%+v err=%v", ok, res, err)
	}
}

func TestThresholdResultsSnapshotIsStableAfterConfigChange(t *testing.T) {
	svc, ctx := setupService(t)
	active, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	snapshot, err := svc.BuildConfigSnapshot(ctx, active.ID)
	if err != nil {
		t.Fatal(err)
	}
	no3 := 0.5
	results := svc.BuildThresholdResultsSnapshot(snapshot, models.WaterTestInput{NitrateMgL: &no3})
	if len(results.Results) != 1 || results.Results[0].Status != StatusOK {
		t.Fatalf("initial result=%+v", results.Results)
	}
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for i := range draft.Tests {
		if draft.Tests[i].Key == "nitrate_no3" {
			draft.Tests[i].Thresholds = []Threshold{{MinValue: floatPtr(0), MaxValue: floatPtr(1), Status: StatusCritical, Message: "changed", SortOrder: 1}}
		}
	}
	if _, err := svc.UpdateDraftConfig(ctx, draft.ID, ConfigUpdatePayload{Tests: draft.Tests}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ActivateConfigVersion(ctx, draft.ID); err != nil {
		t.Fatal(err)
	}
	if results.Results[0].Status != StatusOK {
		t.Fatalf("old snapshot result changed: %+v", results.Results[0])
	}
}

func floatPtr(v float64) *float64 {
	return &v
}
