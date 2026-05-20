package config

import (
	"fmt"
	"strings"
)

var allowedThresholdStatuses = map[string]struct{}{
	"ok":       {},
	"watch":    {},
	"critical": {},
}

func validateWaterTestProfiles(tests []WaterTestProfile) error {
	seen := make(map[string]struct{}, len(tests))
	for i, t := range tests {
		prefix := fmt.Sprintf("tests[%d]", i)
		key := strings.TrimSpace(t.Key)
		if key == "" {
			return fmt.Errorf("%s: test key darf nicht leer sein", prefix)
		}
		if _, dup := seen[key]; dup {
			return fmt.Errorf("%s: doppelter test key %q", prefix, key)
		}
		seen[key] = struct{}{}

		if strings.TrimSpace(t.Label) == "" {
			return fmt.Errorf("%s (%s): label darf nicht leer sein", prefix, key)
		}

		hasValues := len(t.Values) > 0
		if hasValues && strings.TrimSpace(t.Unit) == "" {
			return fmt.Errorf("%s (%s): unit darf nicht leer sein, wenn Messwerte vorhanden sind", prefix, key)
		}

		for j, v := range t.Values {
			if strings.TrimSpace(v.Label) == "" {
				return fmt.Errorf("%s (%s): values[%d] label darf nicht leer sein", prefix, key, j)
			}
		}
	}
	return nil
}

func validateThresholds(thresholds map[string]WaterTestThreshold) error {
	for key, th := range thresholds {
		testKey := strings.TrimSpace(key)
		if testKey == "" {
			return fmt.Errorf("thresholds: test key darf nicht leer sein")
		}
		if len(th.Ranges) == 0 {
			return fmt.Errorf("thresholds[%s]: mindestens ein range erforderlich", testKey)
		}
		for i, r := range th.Ranges {
			prefix := fmt.Sprintf("thresholds[%s].ranges[%d]", testKey, i)
			status := strings.TrimSpace(strings.ToLower(r.Status))
			if _, ok := allowedThresholdStatuses[status]; !ok {
				return fmt.Errorf("%s: status %q ungültig (erlaubt: ok, watch, critical)", prefix, r.Status)
			}
			if r.Min != nil && r.Max != nil && *r.Min > *r.Max {
				return fmt.Errorf("%s: min (%.4f) darf nicht größer als max (%.4f) sein", prefix, *r.Min, *r.Max)
			}
			if strings.TrimSpace(r.Message) == "" {
				return fmt.Errorf("%s: message darf nicht leer sein", prefix)
			}
		}
	}
	return nil
}

func validateTimers(timers map[string]WaterTestTimer) error {
	for key, timer := range timers {
		testKey := strings.TrimSpace(key)
		if testKey == "" {
			return fmt.Errorf("timers: test key darf nicht leer sein")
		}
		if strings.TrimSpace(timer.Label) == "" {
			return fmt.Errorf("timers[%s]: label darf nicht leer sein", testKey)
		}
		if len(timer.Steps) == 0 {
			return fmt.Errorf("timers[%s]: mindestens ein step erforderlich", testKey)
		}
		for i, step := range timer.Steps {
			prefix := fmt.Sprintf("timers[%s].steps[%d]", testKey, i)
			if strings.TrimSpace(step.StepID) == "" {
				return fmt.Errorf("%s: step_id darf nicht leer sein", prefix)
			}
			if strings.TrimSpace(step.Label) == "" {
				return fmt.Errorf("%s: label darf nicht leer sein", prefix)
			}
			if step.DurationSeconds <= 0 {
				return fmt.Errorf("%s: duration_seconds muss > 0 sein (ist %d)", prefix, step.DurationSeconds)
			}
		}
	}
	return nil
}
