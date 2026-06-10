package watertestconfig

type ConfigVersion struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
	IsDraft     bool    `json:"is_draft"`
	CreatedAt   string  `json:"created_at"`
	UpdatedAt   string  `json:"updated_at"`
	ActivatedAt *string `json:"activated_at,omitempty"`
	CreatedBy   *string `json:"created_by,omitempty"`
}

type ConfigVersionDetail struct {
	ConfigVersion
	Tests       []TestConfig              `json:"tests"`
	Thresholds  map[string]ThresholdGroup `json:"thresholds"`
	Timers      map[string]TimerGroup     `json:"timers"`
	TimerGroups []TimerGroup              `json:"timer_groups"`
}

type TestConfig struct {
	ID         int64         `json:"id"`
	Key        string        `json:"key"`
	Label      string        `json:"label"`
	Brand      string        `json:"brand"`
	Unit       string        `json:"unit"`
	InputType  string        `json:"input_type"`
	SortOrder  int           `json:"sort_order"`
	IsActive   bool          `json:"is_active"`
	CanDelete  bool          `json:"can_delete"`
	DeleteNote string        `json:"delete_blocked_reason,omitempty"`
	Values     []ValueOption `json:"values"`
	Thresholds []Threshold   `json:"thresholds"`
	Timers     []TimerStep   `json:"timers"`
}

type ValueOption struct {
	ID           int64   `json:"id,omitempty"`
	Value        float64 `json:"value"`
	DisplayValue string  `json:"display_value,omitempty"`
	Label        string  `json:"label,omitempty"`
	SortOrder    int     `json:"sort_order"`
}

type ThresholdGroup struct {
	Unit   string      `json:"unit"`
	Ranges []Threshold `json:"ranges"`
}

type Threshold struct {
	ID        int64    `json:"id,omitempty"`
	MinValue  *float64 `json:"min_value,omitempty"`
	MaxValue  *float64 `json:"max_value,omitempty"`
	Min       *float64 `json:"min,omitempty"`
	Max       *float64 `json:"max,omitempty"`
	Status    string   `json:"status"`
	Message   string   `json:"message"`
	SortOrder int      `json:"sort_order"`
}

type TimerGroup struct {
	ID        int64       `json:"id,omitempty"`
	TestKey   string      `json:"test_key"`
	Label     string      `json:"label"`
	FieldKey  string      `json:"field_key,omitempty"`
	IsActive  bool        `json:"is_active"`
	SortOrder int         `json:"sort_order"`
	Steps     []TimerStep `json:"steps"`
}

type TimerStep struct {
	ID              int64  `json:"id,omitempty"`
	StepID          string `json:"step_id"`
	StepLabel       string `json:"step_label"`
	Label           string `json:"label"`
	DurationSeconds int    `json:"duration_seconds"`
	StepOrder       int    `json:"step_order"`
}

type ConfigUpdatePayload struct {
	Name        *string      `json:"name,omitempty"`
	Description *string      `json:"description,omitempty"`
	Tests       []TestConfig `json:"tests"`
	TimerGroups []TimerGroup `json:"timer_groups,omitempty"`
}

type ValidationIssue struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ValidationResult struct {
	Valid  bool              `json:"valid"`
	Errors []ValidationIssue `json:"errors"`
}

type ConfigSnapshot struct {
	SnapshotSchemaVersion int                   `json:"snapshot_schema_version"`
	CreatedAt             string                `json:"created_at"`
	SourceConfigVersion   SnapshotSourceVersion `json:"source_config_version"`
	Tests                 []SnapshotTest        `json:"tests"`
}

type SnapshotSourceVersion struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	ActivatedAt *string `json:"activated_at,omitempty"`
}

type SnapshotTest struct {
	TestKey      string              `json:"test_key"`
	Label        string              `json:"label"`
	Brand        string              `json:"brand"`
	Unit         string              `json:"unit"`
	InputType    string              `json:"input_type"`
	SortOrder    int                 `json:"sort_order"`
	ValueOptions []SnapshotValue     `json:"value_options"`
	Thresholds   []SnapshotThreshold `json:"thresholds"`
	Timers       []SnapshotTimer     `json:"timers"`
}

type SnapshotValue struct {
	Value        float64 `json:"value"`
	DisplayValue string  `json:"display_value,omitempty"`
	SortOrder    int     `json:"sort_order"`
}

type SnapshotThreshold struct {
	MinValue  *float64 `json:"min_value"`
	MaxValue  *float64 `json:"max_value"`
	Status    string   `json:"status"`
	Message   string   `json:"message"`
	SortOrder int      `json:"sort_order"`
}

type SnapshotTimer struct {
	StepLabel       string `json:"step_label"`
	DurationSeconds int    `json:"duration_seconds"`
	StepOrder       int    `json:"step_order"`
}

type ThresholdResultsSnapshot struct {
	SnapshotSchemaVersion int                         `json:"snapshot_schema_version"`
	CreatedAt             string                      `json:"created_at"`
	Results               []ThresholdEvaluationResult `json:"results"`
}

type ThresholdEvaluationResult struct {
	TestKey          string                    `json:"test_key"`
	Value            float64                   `json:"value"`
	Unit             string                    `json:"unit,omitempty"`
	Status           string                    `json:"status"`
	Message          string                    `json:"message,omitempty"`
	MatchedThreshold *MatchedSnapshotThreshold `json:"matched_threshold,omitempty"`
}

type MatchedSnapshotThreshold struct {
	MinValue *float64 `json:"min_value"`
	MaxValue *float64 `json:"max_value"`
	Status   string   `json:"status"`
}
