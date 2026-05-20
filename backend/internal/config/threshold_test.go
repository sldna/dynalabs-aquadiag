package config

import "testing"

func TestEvaluateThreshold_NO3LowIsOk(t *testing.T) {
	bundle, err := LoadWaterTestConfig(testConfigDir(t))
	if err != nil {
		t.Fatal(err)
	}
	got := bundle.EvaluateThreshold("nitrate_no3", 0.5)
	if got.Status != "ok" {
		t.Fatalf("status=%q want ok", got.Status)
	}
}

func TestEvaluateThreshold_NO2HighIsCritical(t *testing.T) {
	bundle, err := LoadWaterTestConfig(testConfigDir(t))
	if err != nil {
		t.Fatal(err)
	}
	got := bundle.EvaluateThreshold("nitrite_no2", 0.8)
	if got.Status != "critical" {
		t.Fatalf("status=%q want critical", got.Status)
	}
}

func TestEvaluateThreshold_UnknownKey(t *testing.T) {
	bundle, err := LoadWaterTestConfig(testConfigDir(t))
	if err != nil {
		t.Fatal(err)
	}
	got := bundle.EvaluateThreshold("unknown_test_xyz", 1)
	if got.Status != "unknown" {
		t.Fatalf("status=%q want unknown", got.Status)
	}
}
