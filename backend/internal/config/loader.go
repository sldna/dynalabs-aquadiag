package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

const (
	waterTestsFileName      = "water-tests.yaml"
	waterThresholdsFileName = "water-test-thresholds.yaml"
	waterTimersFileName     = "water-test-timers.yaml"
)

// ResolveConfigDir returns the directory containing water-test YAML files.
// Override with WATER_TEST_CONFIG_DIR; default candidates include ./config and backend/config.
func ResolveConfigDir() (string, error) {
	if p := strings.TrimSpace(os.Getenv("WATER_TEST_CONFIG_DIR")); p != "" {
		if err := assertConfigFiles(p); err != nil {
			return "", err
		}
		return p, nil
	}
	for _, c := range []string{
		"config",
		"backend/config",
		"../config",
		"../backend/config",
		"../../config",
		"../../../backend/config",
	} {
		if err := assertConfigFiles(c); err == nil {
			return c, nil
		}
	}
	return "", fmt.Errorf(
		"keine Wassertest-Config gefunden (Kandidaten: config/, backend/config/); WATER_TEST_CONFIG_DIR setzen",
	)
}

func assertConfigFiles(dir string) error {
	for _, name := range []string{waterTestsFileName, waterThresholdsFileName, waterTimersFileName} {
		p := filepath.Join(dir, name)
		if _, err := os.Stat(p); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
	}
	return nil
}

// LoadWaterTestConfig reads and validates all water-test YAML files from dir.
func LoadWaterTestConfig(dir string) (*WaterTestConfigBundle, error) {
	testsPath := filepath.Join(dir, waterTestsFileName)
	thresholdsPath := filepath.Join(dir, waterThresholdsFileName)
	timersPath := filepath.Join(dir, waterTimersFileName)

	var testsFile waterTestsFile
	if err := readYAML(testsPath, &testsFile); err != nil {
		return nil, fmt.Errorf("water-tests.yaml: %w", err)
	}
	if err := validateWaterTestProfiles(testsFile.Tests); err != nil {
		return nil, err
	}

	var thresholdsFile waterTestThresholdsFile
	if err := readYAML(thresholdsPath, &thresholdsFile); err != nil {
		return nil, fmt.Errorf("water-test-thresholds.yaml: %w", err)
	}
	if thresholdsFile.Thresholds == nil {
		thresholdsFile.Thresholds = map[string]WaterTestThreshold{}
	}
	if err := validateThresholds(thresholdsFile.Thresholds); err != nil {
		return nil, err
	}

	var timersFile waterTestTimersFile
	if err := readYAML(timersPath, &timersFile); err != nil {
		return nil, fmt.Errorf("water-test-timers.yaml: %w", err)
	}
	timersByKey, err := indexTimers(timersFile.Timers)
	if err != nil {
		return nil, err
	}
	if err := validateTimers(timersByKey); err != nil {
		return nil, err
	}

	return &WaterTestConfigBundle{
		Tests:      testsFile.Tests,
		Thresholds: thresholdsFile.Thresholds,
		Timers:     timersByKey,
	}, nil
}

func readYAML(path string, out any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	if err := yaml.Unmarshal(data, out); err != nil {
		return fmt.Errorf("parse: %w", err)
	}
	return nil
}

func indexTimers(list []WaterTestTimer) (map[string]WaterTestTimer, error) {
	out := make(map[string]WaterTestTimer, len(list))
	for i, t := range list {
		key := strings.TrimSpace(t.TestKey)
		if key == "" {
			return nil, fmt.Errorf("timers[%d]: test_key darf nicht leer sein", i)
		}
		if _, exists := out[key]; exists {
			return nil, fmt.Errorf("timers[%d]: doppelter test_key %q", i, key)
		}
		t.TestKey = key
		out[key] = t
	}
	return out, nil
}
