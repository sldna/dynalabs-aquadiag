package config

// EvaluateThreshold returns the matching threshold status for testKey and value.
// Unknown test keys or values outside all ranges return status "unknown".
func (b *WaterTestConfigBundle) EvaluateThreshold(testKey string, value float64) ThresholdEvaluationResult {
	res := ThresholdEvaluationResult{
		TestKey: testKey,
		Value:   value,
		Status:  "unknown",
	}
	if b == nil {
		return res
	}
	th, ok := b.Thresholds[testKey]
	if !ok {
		return res
	}
	res.Unit = th.Unit
	for _, r := range th.Ranges {
		if valueInRange(value, r.Min, r.Max) {
			res.Status = r.Status
			res.Message = r.Message
			return res
		}
	}
	return res
}

func valueInRange(value float64, min, max *float64) bool {
	if min != nil && value < *min {
		return false
	}
	if max != nil && value > *max {
		return false
	}
	return true
}

// EvaluateThreshold is a convenience wrapper when only thresholds are needed.
func EvaluateThreshold(bundle *WaterTestConfigBundle, testKey string, value float64) ThresholdEvaluationResult {
	if bundle == nil {
		return ThresholdEvaluationResult{TestKey: testKey, Value: value, Status: "unknown"}
	}
	return bundle.EvaluateThreshold(testKey, value)
}

// MapThresholdStatusToWaterQuality maps config status to waterquality.Status strings.
func MapThresholdStatusToWaterQuality(status string) string {
	switch status {
	case "ok":
		return "green"
	case "watch":
		return "observe"
	case "critical":
		return "critical"
	default:
		return "unknown"
	}
}
