package watertestconfig

import (
	"context"
	"time"

	"aquadiag/backend/internal/models"
)

func (s *Service) BuildConfigSnapshot(ctx context.Context, versionID int64) (ConfigSnapshot, error) {
	detail, err := s.GetConfigVersion(ctx, versionID)
	if err != nil {
		return ConfigSnapshot{}, err
	}
	createdAt := s.now().UTC().Format(time.RFC3339)
	snapshot := ConfigSnapshot{
		SnapshotSchemaVersion: 1,
		CreatedAt:             createdAt,
		SourceConfigVersion: SnapshotSourceVersion{
			ID:          detail.ID,
			Name:        detail.Name,
			ActivatedAt: detail.ActivatedAt,
		},
		Tests: make([]SnapshotTest, 0, len(detail.Tests)),
	}
	for _, test := range detail.Tests {
		if !test.IsActive && len(test.Timers) == 0 {
			continue
		}
		st := SnapshotTest{
			TestKey:      test.Key,
			Label:        test.Label,
			Brand:        test.Brand,
			Unit:         test.Unit,
			InputType:    test.InputType,
			SortOrder:    test.SortOrder,
			ValueOptions: make([]SnapshotValue, 0, len(test.Values)),
			Thresholds:   make([]SnapshotThreshold, 0, len(test.Thresholds)),
			Timers:       make([]SnapshotTimer, 0, len(test.Timers)),
		}
		for _, opt := range test.Values {
			st.ValueOptions = append(st.ValueOptions, SnapshotValue{
				Value:        opt.Value,
				DisplayValue: opt.DisplayValue,
				SortOrder:    opt.SortOrder,
			})
		}
		for _, th := range test.Thresholds {
			st.Thresholds = append(st.Thresholds, SnapshotThreshold{
				MinValue:  thresholdMin(th),
				MaxValue:  thresholdMax(th),
				Status:    th.Status,
				Message:   th.Message,
				SortOrder: th.SortOrder,
			})
		}
		for _, timer := range test.Timers {
			st.Timers = append(st.Timers, SnapshotTimer{
				StepLabel:       timer.StepLabel,
				DurationSeconds: timer.DurationSeconds,
				StepOrder:       timer.StepOrder,
			})
		}
		snapshot.Tests = append(snapshot.Tests, st)
	}
	return snapshot, nil
}

func (s *Service) BuildThresholdResultsSnapshot(snapshot ConfigSnapshot, submitted models.WaterTestInput) ThresholdResultsSnapshot {
	values := submittedValues(submitted)
	results := make([]ThresholdEvaluationResult, 0, len(values))
	for _, v := range values {
		results = append(results, EvaluateThresholdFromSnapshot(snapshot, v.testKey, v.value))
	}
	return ThresholdResultsSnapshot{
		SnapshotSchemaVersion: 1,
		CreatedAt:             s.now().UTC().Format(time.RFC3339),
		Results:               results,
	}
}

type submittedValue struct {
	testKey string
	value   float64
}

func submittedValues(w models.WaterTestInput) []submittedValue {
	var out []submittedValue
	appendValue := func(key string, ptr *float64) {
		if ptr != nil {
			out = append(out, submittedValue{testKey: key, value: *ptr})
		}
	}
	appendValue("temperature_c", w.TempC)
	appendValue("ph", w.PH)
	appendValue("kh", w.KhDKH)
	appendValue("gh", w.GhDGH)
	appendValue("nitrite_no2", w.NitriteMgL)
	appendValue("nitrate_no3", w.NitrateMgL)
	appendValue("ammonium_nh4", w.AmmoniumMgL)
	appendValue("phosphate_po4", w.PhosphatePO4)
	appendValue("iron_fe", w.IronFe)
	appendValue("oxygen_mg_l", w.OxygenMgL)
	appendValue("oxygen_saturation_pct", w.OxygenSaturationPct)
	appendValue("co2_mg_l", w.CO2MgL)
	return out
}
