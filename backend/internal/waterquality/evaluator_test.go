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
		KhDKH:       ptrF(6),
		GhDGH:       ptrF(10),
		TempC:       ptrF(25),
		NitriteMgL:  ptrF(0),
		NitrateMgL:  ptrF(20),
		AmmoniumMgL: ptrF(0),
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

func TestEvaluateWaterTest_NitriteCriticalDrivesRed(t *testing.T) {
	rec := models.WaterTestRecord{
		PH:         ptrF(7.0),
		NitriteMgL: ptrF(0.4),
	}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusRed {
		t.Fatalf("overall=%q want red", a.Status)
	}
	it, ok := findItem(a.Items, "no2")
	if !ok {
		t.Fatalf("no2 item missing")
	}
	if it.Status != StatusRed {
		t.Fatalf("no2.status=%q want red", it.Status)
	}
	if it.RecommendationShort == "" {
		t.Fatalf("no2 should carry a short recommendation when red")
	}
}

func TestEvaluateWaterTest_NitriteAtOrBelowDetectionLimitStaysGreen(t *testing.T) {
	// 0.01 mg/l ist der typische Nachweis-Grenzwert hobbyüblicher Tropfentests
	// (z. B. JBL, Sera, Tetra). Werte an oder unterhalb dieser Grenze meldet
	// der Test als "<0,01 mg/l" und sollen weiterhin als unauffällig gelten.
	for _, v := range []float64{0, 0.005, 0.009, 0.01} {
		rec := models.WaterTestRecord{NitriteMgL: ptrF(v)}
		a := EvaluateWaterTest(rec)
		if a.Status != StatusGreen {
			t.Fatalf("v=%v overall=%q want green", v, a.Status)
		}
		it, _ := findItem(a.Items, "no2")
		if it.Status != StatusGreen {
			t.Fatalf("v=%v no2.status=%q want green", v, it.Status)
		}
	}
}

func TestEvaluateWaterTest_NitriteAboveDetectionLimitIsYellow(t *testing.T) {
	// Der nächste sichtbare Messschritt typischer Tropfentests ist 0,025 mg/l
	// (JBL/Sera Skala). Dieser Wert ist eine echte Nachweisreaktion und muss
	// mindestens yellow ergeben.
	for _, v := range []float64{0.011, 0.025, 0.05, 0.1, 0.2} {
		rec := models.WaterTestRecord{NitriteMgL: ptrF(v)}
		a := EvaluateWaterTest(rec)
		if a.Status != StatusYellow {
			t.Fatalf("v=%v overall=%q want yellow", v, a.Status)
		}
		it, _ := findItem(a.Items, "no2")
		if it.Status != StatusYellow {
			t.Fatalf("v=%v no2.status=%q want yellow", v, it.Status)
		}
	}
}

func TestOverallStatus_RedBeatsYellow(t *testing.T) {
	items := []Item{
		{Key: "ph", Status: StatusGreen},
		{Key: "no2", Status: StatusYellow},
		{Key: "no3", Status: StatusRed},
	}
	if got := OverallStatus(items); got != StatusRed {
		t.Fatalf("got %q want red", got)
	}
}

func TestOverallStatus_YellowBeatsGreen(t *testing.T) {
	items := []Item{
		{Status: StatusGreen},
		{Status: StatusYellow},
	}
	if got := OverallStatus(items); got != StatusYellow {
		t.Fatalf("got %q want yellow", got)
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

func TestEvaluateWaterTest_PHOutOfRange(t *testing.T) {
	rec := models.WaterTestRecord{PH: ptrF(5.4)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusRed {
		t.Fatalf("pH 5.4 should drive red, got %q", a.Status)
	}
}

func TestEvaluateWaterTest_PHYellowBand(t *testing.T) {
	rec := models.WaterTestRecord{PH: ptrF(6.2)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusYellow {
		t.Fatalf("pH 6.2 should be yellow, got %q", a.Status)
	}
}

func TestEvaluateWaterTest_OxygenLow(t *testing.T) {
	rec := models.WaterTestRecord{OxygenMgL: ptrF(3.5)}
	a := EvaluateWaterTest(rec)
	if a.Status != StatusRed {
		t.Fatalf("o2 3.5 should be red, got %q", a.Status)
	}
}

func TestEvaluateWaterTest_TemperatureBands(t *testing.T) {
	cases := []struct {
		name string
		t    float64
		want Status
	}{
		{"normal 25", 25, StatusGreen},
		{"yellow 20", 20, StatusYellow},
		{"red 15", 15, StatusRed},
		{"red 32", 32, StatusRed},
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
		{0.2, StatusYellow},
		{0.6, StatusRed},
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
	if it.Message == "" {
		t.Fatalf("message missing")
	}
}
