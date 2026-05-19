package waterquality

import (
	"testing"

	"aquadiag/backend/internal/models"
)

func TestEvaluateWaterValue_JBLFreshwater(t *testing.T) {
	profile := ProfileFreshwaterCommunity
	cases := []struct {
		param string
		value float64
		want  Status
	}{
		{"ph", 8.2, StatusGreen},
		{"ph", 8.3, StatusObserve},
		{"ph", 8.6, StatusWarning},
		{"kh", 16, StatusGreen},
		{"gh", 25, StatusGreen},
		{"no2", 0.1, StatusGreen},
		{"no2", 0.2, StatusObserve},
		{"no2", 0.3, StatusWarning},
		{"no2", 0.6, StatusCritical},
		{"no3", 30, StatusGreen},
		{"no3", 40, StatusObserve},
		{"no3", 75, StatusWarning},
		{"nh4", 0.1, StatusGreen},
	}
	for _, c := range cases {
		got := EvaluateWaterValue(c.param, c.value, profile)
		if got.Status != c.want {
			t.Errorf("%s=%v status=%q want %q", c.param, c.value, got.Status, c.want)
		}
		if got.StatusLabel == "" {
			t.Errorf("%s=%v missing status_label", c.param, c.value)
		}
		if got.Message == "" {
			t.Errorf("%s=%v missing message", c.param, c.value)
		}
	}
}

func TestEvaluateWaterValue_UnknownParameter(t *testing.T) {
	got := EvaluateWaterValue("silicate", 1, ProfileFreshwaterCommunity)
	if got.Status != StatusUnknown {
		t.Fatalf("status=%q want unknown", got.Status)
	}
}

func TestEvaluateWaterValue_NH4WithPHContext(t *testing.T) {
	ph := 8.2
	temp := 26.0
	got := EvaluateWaterValueWithContext("nh4", 0.1, ProfileFreshwaterCommunity, EvalContext{
		PH: &ph, TempC: &temp,
	})
	if got.Status != StatusGreen {
		t.Fatalf("status=%q want green", got.Status)
	}
	if got.Message == "" {
		t.Fatal("expected message")
	}
}

func TestEvaluateWaterTest_JBLRegressionGreenPanel(t *testing.T) {
	rec := modelsWaterTest(8.0, 10, 15, 0.1, 25, 0.1)
	a := EvaluateWaterTest(rec)
	if a.Status != StatusGreen {
		t.Fatalf("overall=%q want green; items=%+v", a.Status, a.Items)
	}
}

func TestEvaluateWaterTest_JBLRegressionNitriteCritical(t *testing.T) {
	rec := modelsWaterTest(7.0, 6, 10, 0.6, 20, 0)
	a := EvaluateWaterTest(rec)
	if a.Status != StatusCritical {
		t.Fatalf("overall=%q want critical", a.Status)
	}
}

func TestEvaluateWaterTest_PH83ObserveOnly(t *testing.T) {
	rec := modelsWaterTestPtr(ptrF(8.3), nil, nil, nil, nil, nil)
	a := EvaluateWaterTest(rec)
	if a.Status != StatusObserve {
		t.Fatalf("overall=%q want observe", a.Status)
	}
	it, ok := findItem(a.Items, "ph")
	if !ok || it.Status != StatusObserve {
		t.Fatalf("ph item=%+v", it)
	}
}

// modelsWaterTest builds a minimal record for regression panels.
func modelsWaterTest(ph, kh, gh, no2, no3, nh4 float64) models.WaterTestRecord {
	return modelsWaterTestPtr(&ph, &kh, &gh, &no2, &no3, &nh4)
}

func modelsWaterTestPtr(ph, kh, gh, no2, no3, nh4 *float64) models.WaterTestRecord {
	return models.WaterTestRecord{
		PH:          ph,
		KhDKH:       kh,
		GhDGH:       gh,
		NitriteMgL:  no2,
		NitrateMgL:  no3,
		AmmoniumMgL: nh4,
	}
}
