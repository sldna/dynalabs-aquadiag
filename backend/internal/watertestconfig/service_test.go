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

func TestDraftCanUpdateTimerGroups(t *testing.T) {
	svc, ctx := setupService(t)
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(draft.TimerGroups) == 0 {
		t.Fatal("expected timer groups")
	}
	draft.TimerGroups[0].Label = "Nitrit Timer angepasst"
	draft.TimerGroups[0].IsActive = false
	updated, err := svc.UpdateDraftConfig(ctx, draft.ID, ConfigUpdatePayload{Tests: draft.Tests, TimerGroups: draft.TimerGroups})
	if err != nil {
		t.Fatal(err)
	}
	if updated.TimerGroups[0].Label != "Nitrit Timer angepasst" || updated.TimerGroups[0].IsActive {
		t.Fatalf("timer group not updated: %+v", updated.TimerGroups[0])
	}
}

func TestDraftVersionCanBeDeleted(t *testing.T) {
	svc, ctx := setupService(t)
	active, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err := svc.DeleteConfigVersion(ctx, draft.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.GetConfigVersion(ctx, draft.ID); err == nil {
		t.Fatal("expected deleted draft to be missing")
	}
	if err := svc.DeleteConfigVersion(ctx, active.ID); err == nil {
		t.Fatal("expected active version delete to be rejected")
	}
}

func TestDraftCanRemoveUnmeasuredTestWithoutChangingOldVersion(t *testing.T) {
	svc, ctx := setupService(t)
	oldActive, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	withoutPhosphate := draft.Tests[:0]
	for _, test := range draft.Tests {
		if test.Key != "phosphate_po4" {
			withoutPhosphate = append(withoutPhosphate, test)
		}
	}
	updated, err := svc.UpdateDraftConfig(ctx, draft.ID, ConfigUpdatePayload{Tests: withoutPhosphate})
	if err != nil {
		t.Fatal(err)
	}
	if hasTest(updated.Tests, "phosphate_po4") {
		t.Fatal("removed test still present in draft")
	}
	reloadedOld, err := svc.GetConfigVersion(ctx, oldActive.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !hasTest(reloadedOld.Tests, "phosphate_po4") {
		t.Fatal("old version lost removed draft test")
	}
	activated, err := svc.ActivateConfigVersion(ctx, draft.ID)
	if err != nil {
		t.Fatal(err)
	}
	if hasTest(activated.Tests, "phosphate_po4") {
		t.Fatal("removed test still present after activation")
	}
}

func TestMeasuredTestIsNotDeleteable(t *testing.T) {
	svc, ctx := setupService(t)
	tankID, err := db.InsertTank(ctx, svc.repo.db, "Wohnzimmer", 180)
	if err != nil {
		t.Fatal(err)
	}
	no3 := 0.5
	if _, err := db.InsertWaterTest(ctx, svc.repo.db, tankID, models.WaterTestInput{NitrateMgL: &no3}, []string{}); err != nil {
		t.Fatal(err)
	}
	active, err := svc.GetActiveConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var nitrate *TestConfig
	var phosphate *TestConfig
	for i := range active.Tests {
		switch active.Tests[i].Key {
		case "nitrate_no3":
			nitrate = &active.Tests[i]
		case "phosphate_po4":
			phosphate = &active.Tests[i]
		}
	}
	if nitrate == nil || nitrate.CanDelete {
		t.Fatalf("nitrate should be blocked from deletion: %+v", nitrate)
	}
	if phosphate == nil || !phosphate.CanDelete {
		t.Fatalf("phosphate should be deleteable: %+v", phosphate)
	}
}

func TestMeasuredTestCannotBeRemovedFromDraft(t *testing.T) {
	svc, ctx := setupService(t)
	tankID, err := db.InsertTank(ctx, svc.repo.db, "Wohnzimmer", 180)
	if err != nil {
		t.Fatal(err)
	}
	no3 := 0.5
	if _, err := db.InsertWaterTest(ctx, svc.repo.db, tankID, models.WaterTestInput{NitrateMgL: &no3}, []string{}); err != nil {
		t.Fatal(err)
	}
	draft, err := svc.CreateDraftFromActive(ctx)
	if err != nil {
		t.Fatal(err)
	}
	next := draft.Tests[:0]
	for _, test := range draft.Tests {
		if test.Key != "nitrate_no3" {
			next = append(next, test)
		}
	}
	_, err = svc.UpdateDraftConfig(ctx, draft.ID, ConfigUpdatePayload{Tests: next})
	if err == nil {
		t.Fatal("expected validation error")
	}
	res, ok := IsValidationError(err)
	if !ok || res.Valid {
		t.Fatalf("expected validation result, got ok=%v res=%+v err=%v", ok, res, err)
	}
}

func TestDraftNameFromDoesNotRepeatSuffix(t *testing.T) {
	got := draftNameFrom("JBL Freshwater Default v1 Entwurf Entwurf")
	if got != "JBL Freshwater Default v1 Entwurf" {
		t.Fatalf("draft name=%q", got)
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

func hasTest(tests []TestConfig, key string) bool {
	for _, test := range tests {
		if test.Key == key {
			return true
		}
	}
	return false
}
