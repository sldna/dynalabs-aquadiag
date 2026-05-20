package config

// WaterTestConfigBundle aggregates all water-test YAML configuration.
type WaterTestConfigBundle struct {
	Tests      []WaterTestProfile            `json:"tests"`
	Thresholds map[string]WaterTestThreshold `json:"thresholds"`
	Timers     map[string]WaterTestTimer     `json:"timers"`
}

// WaterTestProfile describes one JBL-oriented capture field.
type WaterTestProfile struct {
	Key       string              `yaml:"key" json:"key"`
	Label     string              `yaml:"label" json:"label"`
	Brand     string              `yaml:"brand" json:"brand"`
	Unit      string              `yaml:"unit" json:"unit"`
	InputType string              `yaml:"input_type" json:"input_type"`
	Values    []WaterTestValueOpt `yaml:"values" json:"values"`
}

// WaterTestValueOpt is a selectable measurement step on a JBL color scale.
type WaterTestValueOpt struct {
	Value float64 `yaml:"value" json:"value"`
	Label string  `yaml:"label" json:"label"`
}

// WaterTestThreshold groups ranges for one test key.
type WaterTestThreshold struct {
	Unit   string                    `yaml:"unit" json:"unit"`
	Ranges []WaterTestThresholdRange `yaml:"ranges" json:"ranges"`
}

// WaterTestThresholdRange maps a numeric band to ok | watch | critical.
type WaterTestThresholdRange struct {
	Min     *float64 `yaml:"min" json:"min,omitempty"`
	Max     *float64 `yaml:"max" json:"max,omitempty"`
	Status  string   `yaml:"status" json:"status"`
	Message string   `yaml:"message" json:"message"`
}

// WaterTestTimer defines one or more countdown steps for a test.
type WaterTestTimer struct {
	TestKey  string               `yaml:"test_key" json:"test_key"`
	Label    string               `yaml:"label" json:"label"`
	FieldKey string               `yaml:"field_key,omitempty" json:"field_key,omitempty"`
	Steps    []WaterTestTimerStep `yaml:"steps" json:"steps"`
}

// WaterTestTimerStep is a single timer phase.
type WaterTestTimerStep struct {
	StepID          string `yaml:"step_id" json:"step_id"`
	Label           string `yaml:"label" json:"label"`
	DurationSeconds int    `yaml:"duration_seconds" json:"duration_seconds"`
}

// ThresholdEvaluationResult is returned by EvaluateThreshold.
type ThresholdEvaluationResult struct {
	TestKey string  `json:"test_key"`
	Value   float64 `json:"value"`
	Unit    string  `json:"unit,omitempty"`
	Status  string  `json:"status"`
	Message string  `json:"message,omitempty"`
}

type waterTestsFile struct {
	Tests []WaterTestProfile `yaml:"tests"`
}

type waterTestThresholdsFile struct {
	Thresholds map[string]WaterTestThreshold `yaml:"thresholds"`
}

type waterTestTimersFile struct {
	Timers []WaterTestTimer `yaml:"timers"`
}
