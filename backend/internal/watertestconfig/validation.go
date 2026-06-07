package watertestconfig

import (
	"fmt"
	"sort"
	"strings"
)

const (
	StatusOK       = "ok"
	StatusWatch    = "watch"
	StatusCritical = "critical"
	StatusUnknown  = "unknown"
)

func ValidateDetail(detail ConfigVersionDetail) ValidationResult {
	var issues []ValidationIssue
	activeKeys := map[string]bool{}

	for ti, test := range detail.Tests {
		prefix := fmt.Sprintf("tests[%d]", ti)
		key := strings.TrimSpace(test.Key)
		if key == "" {
			issues = appendIssue(issues, prefix+".key", "required", "test_key darf nicht leer sein.")
		}
		if strings.TrimSpace(test.Label) == "" {
			issues = appendIssue(issues, prefix+".label", "required", "label darf nicht leer sein.")
		}
		if len(test.Values) > 0 && strings.TrimSpace(test.Unit) == "" {
			issues = appendIssue(issues, prefix+".unit", "required", "unit darf bei Messwertoptionen nicht leer sein.")
		}
		if key != "" {
			if activeKeys[key] {
				issues = appendIssue(issues, prefix+".key", "duplicate", "test_key ist doppelt.")
			}
			activeKeys[key] = true
		}
		issues = append(issues, validateThresholdsForTest(prefix, test.Thresholds)...)
		for si, timer := range test.Timers {
			if strings.TrimSpace(timer.StepLabel) == "" && strings.TrimSpace(timer.Label) == "" {
				issues = appendIssue(issues, fmt.Sprintf("%s.timers[%d].step_label", prefix, si), "required", "step_label darf nicht leer sein.")
			}
			if timer.DurationSeconds <= 0 {
				issues = appendIssue(issues, fmt.Sprintf("%s.timers[%d].duration_seconds", prefix, si), "invalid_range", "duration_seconds muss größer als 0 sein.")
			}
		}
	}

	return ValidationResult{Valid: len(issues) == 0, Errors: issues}
}

func validateThresholdsForTest(prefix string, thresholds []Threshold) []ValidationIssue {
	var issues []ValidationIssue
	for i, th := range thresholds {
		field := fmt.Sprintf("%s.thresholds[%d]", prefix, i)
		if !validStatus(th.Status) {
			issues = appendIssue(issues, field+".status", "invalid_enum", "status muss ok, watch oder critical sein.")
		}
		if strings.TrimSpace(th.Message) == "" {
			issues = appendIssue(issues, field+".message", "required", "message darf nicht leer sein.")
		}
		min := thresholdMin(th)
		max := thresholdMax(th)
		if min != nil && max != nil && *min > *max {
			issues = appendIssue(issues, field, "invalid_range", "min_value darf nicht größer als max_value sein.")
		}
	}
	if hasOverlappingThresholds(thresholds) {
		issues = appendIssue(issues, prefix+".thresholds", "overlap", "Threshold-Bereiche dürfen sich nicht überlappen.")
	}
	return issues
}

func appendIssue(in []ValidationIssue, field string, code string, message string) []ValidationIssue {
	return append(in, ValidationIssue{Field: field, Code: code, Message: message})
}

func validStatus(status string) bool {
	return status == StatusOK || status == StatusWatch || status == StatusCritical
}

func thresholdMin(th Threshold) *float64 {
	if th.MinValue != nil {
		return th.MinValue
	}
	return th.Min
}

func thresholdMax(th Threshold) *float64 {
	if th.MaxValue != nil {
		return th.MaxValue
	}
	return th.Max
}

type interval struct {
	min *float64
	max *float64
}

func hasOverlappingThresholds(thresholds []Threshold) bool {
	if len(thresholds) < 2 {
		return false
	}
	ranges := make([]interval, 0, len(thresholds))
	for _, th := range thresholds {
		ranges = append(ranges, interval{min: thresholdMin(th), max: thresholdMax(th)})
	}
	sort.SliceStable(ranges, func(i, j int) bool {
		if ranges[i].min == nil {
			return true
		}
		if ranges[j].min == nil {
			return false
		}
		return *ranges[i].min < *ranges[j].min
	})
	for i := 1; i < len(ranges); i++ {
		prev := ranges[i-1]
		cur := ranges[i]
		if prev.max == nil || cur.min == nil {
			return true
		}
		if *cur.min < *prev.max {
			return true
		}
	}
	return false
}
