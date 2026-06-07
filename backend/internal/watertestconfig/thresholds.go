package watertestconfig

func EvaluateThresholdFromSnapshot(snapshot ConfigSnapshot, testKey string, value float64) ThresholdEvaluationResult {
	res := ThresholdEvaluationResult{TestKey: testKey, Value: value, Status: StatusUnknown}
	for _, test := range snapshot.Tests {
		if test.TestKey != testKey {
			continue
		}
		res.Unit = test.Unit
		for _, th := range test.Thresholds {
			if snapshotValueInRange(value, th.MinValue, th.MaxValue) {
				res.Status = th.Status
				res.Message = th.Message
				res.MatchedThreshold = &MatchedSnapshotThreshold{
					MinValue: th.MinValue,
					MaxValue: th.MaxValue,
					Status:   th.Status,
				}
				return res
			}
		}
		return res
	}
	return res
}

func snapshotValueInRange(value float64, min *float64, max *float64) bool {
	if min != nil && value < *min {
		return false
	}
	if max != nil && value > *max {
		return false
	}
	return true
}

func ThresholdStatusToWaterQuality(status string) string {
	switch status {
	case StatusOK:
		return "green"
	case StatusWatch:
		return "observe"
	case StatusCritical:
		return "critical"
	default:
		return "unknown"
	}
}
