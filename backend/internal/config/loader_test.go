package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func testConfigDir(t *testing.T) string {
	t.Helper()
	dir, err := ResolveConfigDir()
	if err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestLoadWaterTestConfig_ValidYAML(t *testing.T) {
	bundle, err := LoadWaterTestConfig(testConfigDir(t))
	if err != nil {
		t.Fatal(err)
	}
	if len(bundle.Tests) == 0 {
		t.Fatal("expected tests")
	}
	if len(bundle.Thresholds) == 0 {
		t.Fatal("expected thresholds")
	}
	if len(bundle.Timers) == 0 {
		t.Fatal("expected timers")
	}
	if _, ok := bundle.Thresholds["nitrate_no3"]; !ok {
		t.Fatal("expected nitrate_no3 threshold")
	}
}

func TestLoadWaterTestConfig_InvalidTimerDuration(t *testing.T) {
	dir := t.TempDir()
	writeMinimalValidConfig(t, dir)
	timers := `timers:
  - test_key: bad
    label: Bad
    steps:
      - step_id: s1
        label: Step
        duration_seconds: 0
`
	if err := os.WriteFile(filepath.Join(dir, waterTimersFileName), []byte(timers), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := LoadWaterTestConfig(dir)
	if err == nil || !strings.Contains(err.Error(), "duration_seconds") {
		t.Fatalf("want duration error, got %v", err)
	}
}

func TestLoadWaterTestConfig_InvalidThresholdStatus(t *testing.T) {
	dir := t.TempDir()
	writeMinimalValidConfig(t, dir)
	thresholds := `thresholds:
  bad_key:
    unit: mg/l
    ranges:
      - min: 0
        max: 1
        status: danger
        message: test
`
	if err := os.WriteFile(filepath.Join(dir, waterThresholdsFileName), []byte(thresholds), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := LoadWaterTestConfig(dir)
	if err == nil || !strings.Contains(err.Error(), "status") {
		t.Fatalf("want status error, got %v", err)
	}
}

func writeMinimalValidConfig(t *testing.T, dir string) {
	t.Helper()
	tests := `tests:
  - key: ph
    label: pH
    brand: JBL
    unit: ""
    input_type: number
    values: []
`
	thresholds := `thresholds:
  ph:
    unit: ""
    ranges:
      - min: 6
        max: 8
        status: ok
        message: ok
`
	timers := `timers:
  - test_key: ph_timer
    label: pH
    steps:
      - step_id: s1
        label: Step
        duration_seconds: 60
`
	for name, content := range map[string]string{
		waterTestsFileName:      tests,
		waterThresholdsFileName: thresholds,
		waterTimersFileName:     timers,
	} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}
