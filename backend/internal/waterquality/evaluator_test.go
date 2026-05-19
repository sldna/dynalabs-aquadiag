package waterquality

import (
	"testing"

	"aquadiag/backend/internal/models"
)

func ptrF(v float64) *float64 { return &v }

func findItem(items []Item, key string) (Item, bool) {
	for _, it := range items {
		if it.Key == key {
			return it, true
		}
	}
	return Item{}, false
}

func TestEvaluateWaterTest_UnknownWhenAllNil(t *testing.T) {
	a := EvaluateWaterTest(models.WaterTestRecord{})
	if a.Status != StatusUnknown {
		t.Fatalf("status=%q want unknown", a.Status)
	}
	if len(a.Items) != 0 {
		t.Fatalf("items=%d want 0", len(a.Items))
	}
}

func TestEvaluateWaterTest_GreenAllNormal(t *testing.T) {
	rec := models.WaterTestRecord{
		PH:          ptrF(7.2),
		KhDKH:       ptrF(10),
		GhDGH:       ptrF(15),
		TempC:       ptrF(25),
		NitriteMgL:  ptrF(0.05),
		NitrateMgL:  ptrF(20),
		AmmoniumMgL: ptrF(0.05),
		OxygenMgL:   ptrF(7),
		CO2MgL:      ptrF(25),
	}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusGreen {
		t.Fatalf("overall=%q want green; items=%+v", a.Status, a.Items)
	}
	for _, it := range a.Items {
		if it.Status != StatusGreen {
			t.Fatalf("%s status=%q want green", it.Key, it.Status)
		}
	}
}

func TestEvaluateWaterTest_NitriteCriticalDrivesCritical(t *testing.T) {
	rec := models.WaterTestRecord{
		PH:         ptrF(7.0),
		NitriteMgL: ptrF(0.6),
	}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusCritical {
		t.Fatalf("overall=%q want critical", a.Status)
	}
	it, ok := findItem(a.Items, "no2")
	if !ok {
		t.Fatalf("no2 item missing")
	}
	if it.Status != StatusCritical {
		t.Fatalf("no2.status=%q want critical", it.Status)
	}
	if it.RecommendationShort == "" {
		t.Fatalf("no2 should carry a short recommendation when critical")
	}
}

func TestEvaluateWaterTest_NitriteAtJBLGreenLimit(t *testing.T) {
	rec := models.WaterTestRecord{NitriteMgL: ptrF(0.1)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusGreen {
		t.Fatalf("overall=%q want green", a.Status)
	}
	it, _ := findItem(a.Items, "no2")
	if it.Status != StatusGreen {
		t.Fatalf("no2.status=%q want green", it.Status)
	}
}

func TestEvaluateWaterTest_NitriteObserveBand(t *testing.T) {
	rec := models.WaterTestRecord{NitriteMgL: ptrF(0.15)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusObserve {
		t.Fatalf("overall=%q want observe", a.Status)
	}
}

func TestEvaluateWaterTest_NitriteWarningBand(t *testing.T) {
	rec := models.WaterTestRecord{NitriteMgL: ptrF(0.3)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusWarning {
		t.Fatalf("overall=%q want warning", a.Status)
	}
}

func TestOverallStatus_CriticalBeatsWarning(t *testing.T) {
	items := []Item{
		{Key: "ph", Status: StatusGreen},
		{Key: "no2", Status: StatusWarning},
		{Key: "no3", Status: StatusCritical},
	}
	if got := OverallStatus(items); got != StatusCritical {
		t.Fatalf("got %q want critical", got)
	}
}

func TestOverallStatus_WarningBeatsObserve(t *testing.T) {
	items := []Item{
		{Status: StatusObserve},
		{Status: StatusWarning},
	}
	if got := OverallStatus(items); got != StatusWarning {
		t.Fatalf("got %q want warning", got)
	}
}

func TestOverallStatus_ObserveBeatsGreen(t *testing.T) {
	items := []Item{
		{Status: StatusGreen},
		{Status: StatusObserve},
	}
	if got := OverallStatus(items); got != StatusObserve {
		t.Fatalf("got %q want observe", got)
	}
}

func TestOverallStatus_AllGreenStaysGreen(t *testing.T) {
	items := []Item{
		{Status: StatusGreen},
		{Status: StatusGreen},
	}
	if got := OverallStatus(items); got != StatusGreen {
		t.Fatalf("got %q want green", got)
	}
}

func TestOverallStatus_EmptyIsUnknown(t *testing.T) {
	if got := OverallStatus(nil); got != StatusUnknown {
		t.Fatalf("got %q want unknown", got)
	}
}

func TestEvaluateWaterTest_PHCriticalLow(t *testing.T) {
	rec := models.WaterTestRecord{PH: ptrF(5.4)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusCritical {
		t.Fatalf("pH 5.4 should drive critical, got %q", a.Status)
	}
}

func TestEvaluateWaterTest_PHObserveBand(t *testing.T) {
	rec := models.WaterTestRecord{PH: ptrF(6.6)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusObserve {
		t.Fatalf("pH 6.6 should be observe, got %q", a.Status)
	}
}

func TestEvaluateWaterTest_OxygenLow(t *testing.T) {
	rec := models.WaterTestRecord{OxygenMgL: ptrF(3.5)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusWarning {
		t.Fatalf("o2 3.5 should be warning, got %q", a.Status)
	}
}

func TestEvaluateWaterTest_TemperatureBands(t *testing.T) {
	cases := []struct {
		name string
		t    float64
		want Status
	}{
		{"normal 25", 25, StatusGreen},
		{"observe 20", 20, StatusObserve},
		{"warning 17", 17, StatusWarning},
		{"critical 15", 15, StatusCritical},
		{"critical 33", 33, StatusCritical},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			rec := models.WaterTestRecord{TempC: ptrF(c.t)}
			a := EvaluateWaterTest(rec)
			if a.Status != c.want {
				t.Fatalf("got %q want %q", a.Status, c.want)
			}
		})
	}
}

func TestEvaluateWaterTest_AmmoniumThresholds(t *testing.T) {
	cases := []struct {
		v    float64
		want Status
	}{
		{0, StatusGreen},
		{0.1, StatusGreen},
		{0.15, StatusObserve},
		{0.6, StatusCritical},
	}
	for _, c := range cases {
		rec := models.WaterTestRecord{AmmoniumMgL: ptrF(c.v)}
		a := EvaluateWaterTest(rec)
		if a.Status != c.want {
			t.Fatalf("ammonium %v: got %q want %q", c.v, a.Status, c.want)
		}
	}
}

func TestEvaluateWaterTest_ItemContainsLabelAndUnit(t *testing.T) {
	rec := models.WaterTestRecord{NitriteMgL: ptrF(0.1)}
	a := EvaluateWaterTest(rec)
	it, ok := findItem(a.Items, "no2")
	if !ok {
		t.Fatalf("no2 missing")
	}
	if it.Label == "" {
		t.Fatalf("label missing")
	}
	if it.Unit != "mg/l" {
		t.Fatalf("unit=%q", it.Unit)
	}
	if it.Message == "" || it.StatusLabel == "" {
		t.Fatalf("message or status_label missing: %+v", it)
	}
}
