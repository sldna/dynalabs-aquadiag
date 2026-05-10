package models

import "encoding/json"

// Tank is a persisted aquarium profile.
type Tank struct {
	ID                        int64    `json:"id"`
	Name                      string   `json:"name"`
	VolumeLiters              float64  `json:"volume_liters"`
	Notes                     *string  `json:"notes,omitempty"`
	CreatedAt                 string   `json:"created_at"`
	LastWaterTestAt           *string  `json:"last_water_test_at,omitempty"`
	LatestDiagnosisType       *string  `json:"latest_diagnosis_type,omitempty"`
	LatestDiagnosisSeverity   *string  `json:"latest_diagnosis_severity,omitempty"`
	LatestDiagnosisConfidence *float64 `json:"latest_diagnosis_confidence,omitempty"`
}

// WaterTestRecord is a persisted water test row for listing and detail endpoints.
type WaterTestRecord struct {
	ID                  int64    `json:"id"`
	TankID              int64    `json:"tank_id"`
	PH                  *float64 `json:"ph,omitempty"`
	KhDKH               *float64 `json:"kh_dkh,omitempty"`
	GhDGH               *float64 `json:"gh_dgh,omitempty"`
	TempC               *float64 `json:"temp_c,omitempty"`
	NitriteMgL          *float64 `json:"nitrite_mg_l,omitempty"`
	NitrateMgL          *float64 `json:"nitrate_mg_l,omitempty"`
	AmmoniumMgL         *float64 `json:"ammonium_mg_l,omitempty"`
	OxygenMgL           *float64 `json:"oxygen_mg_l,omitempty"`
	OxygenSaturationPct *float64 `json:"oxygen_saturation_pct,omitempty"`
	CO2MgL              *float64 `json:"co2_mg_l,omitempty"`
	Symptoms            []string `json:"symptoms"`
	Notes               *string  `json:"notes,omitempty"`
	CreatedAt           string   `json:"created_at"`
}

// FollowUpAnswerItem is optional user context for POST /v1/diagnose (follow-up Q&A).
// It does not drive the rule engine unless mapped to structured fields elsewhere.
type FollowUpAnswerItem struct {
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// DiagnoseRequest is the body for POST /v1/diagnose.
type DiagnoseRequest struct {
	TankID *int64 `json:"tank_id"`

	// Tank, if set, creates a new tank (used when tank_id is absent).
	Tank *InlineTank `json:"tank"`

	Water    WaterTestInput `json:"water"`
	Symptoms []string       `json:"symptoms"`

	// FollowUpAnswers optional free-text answers to prior follow-up questions (reanalysis).
	FollowUpAnswers []FollowUpAnswerItem `json:"follow_up_answers,omitempty"`
}

// UnmarshalJSON supports both the current shape
//
//	{ "water": { ... }, "symptoms": [...] }
//
// and a legacy/flat shape where water fields are provided at the top-level:
//
//	{ "co2_mg_l": 30, ... }
//
// This is strictly input compatibility only; the API response stays unchanged.
func (r *DiagnoseRequest) UnmarshalJSON(data []byte) error {
	type raw DiagnoseRequest
	aux := struct {
		raw

		// Flat water fields (aliases for Water.* when Water.* is nil)
		PH                  *float64 `json:"ph"`
		KhDKH               *float64 `json:"kh_dkh"`
		GhDGH               *float64 `json:"gh_dgh"`
		TempC               *float64 `json:"temp_c"`
		NitriteMgL          *float64 `json:"nitrite_mg_l"`
		NitrateMgL          *float64 `json:"nitrate_mg_l"`
		AmmoniumMgL         *float64 `json:"ammonium_mg_l"`
		OxygenMgL           *float64 `json:"oxygen_mg_l"`
		OxygenSaturationPct *float64 `json:"oxygen_saturation_pct"`
		CO2MgL              *float64 `json:"co2_mg_l"`
		Notes               *string  `json:"notes"`
	}{}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	*r = DiagnoseRequest(aux.raw)

	// Merge flat aliases into nested water object when absent.
	if r.Water.PH == nil {
		r.Water.PH = aux.PH
	}
	if r.Water.KhDKH == nil {
		r.Water.KhDKH = aux.KhDKH
	}
	if r.Water.GhDGH == nil {
		r.Water.GhDGH = aux.GhDGH
	}
	if r.Water.TempC == nil {
		r.Water.TempC = aux.TempC
	}
	if r.Water.NitriteMgL == nil {
		r.Water.NitriteMgL = aux.NitriteMgL
	}
	if r.Water.NitrateMgL == nil {
		r.Water.NitrateMgL = aux.NitrateMgL
	}
	if r.Water.AmmoniumMgL == nil {
		r.Water.AmmoniumMgL = aux.AmmoniumMgL
	}
	if r.Water.OxygenMgL == nil {
		r.Water.OxygenMgL = aux.OxygenMgL
	}
	if r.Water.OxygenSaturationPct == nil {
		r.Water.OxygenSaturationPct = aux.OxygenSaturationPct
	}
	if r.Water.CO2MgL == nil {
		r.Water.CO2MgL = aux.CO2MgL
	}
	if r.Water.Notes == nil {
		r.Water.Notes = aux.Notes
	}
	return nil
}

// InlineTank is used to create a tank within a diagnose call.
type InlineTank struct {
	Name         string  `json:"name"`
	VolumeLiters float64 `json:"volume_liters"`
}

// WaterTestInput captures optional measurements and notes.
// Konzentrationen (Nitrit, Nitrat, Ammonium, CO₂) werden in mg/l erwartet (wie übliche Testkits).
type WaterTestInput struct {
	PH                  *float64 `json:"ph"`
	KhDKH               *float64 `json:"kh_dkh"`
	GhDGH               *float64 `json:"gh_dgh"`
	TempC               *float64 `json:"temp_c"`
	NitriteMgL          *float64 `json:"nitrite_mg_l"`
	NitrateMgL          *float64 `json:"nitrate_mg_l"`
	AmmoniumMgL         *float64 `json:"ammonium_mg_l"`
	OxygenMgL           *float64 `json:"oxygen_mg_l"`
	OxygenSaturationPct *float64 `json:"oxygen_saturation_pct"`
	CO2MgL              *float64 `json:"co2_mg_l"`
	Notes               *string  `json:"notes"`
}

// UnmarshalJSON akzeptiert legacy Schlüssel *_ppm als Alias für dieselben Zahlen (mg/l).
func (w *WaterTestInput) UnmarshalJSON(data []byte) error {
	type raw WaterTestInput
	aux := struct {
		raw
		LegacyNitrite  *float64 `json:"nitrite_ppm"`
		LegacyNitrate  *float64 `json:"nitrate_ppm"`
		LegacyAmmonium *float64 `json:"ammonia_ppm"`
		LegacyCO2      *float64 `json:"co2_ppm"`
	}{}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}
	*w = WaterTestInput(aux.raw)
	if w.NitriteMgL == nil {
		w.NitriteMgL = aux.LegacyNitrite
	}
	if w.NitrateMgL == nil {
		w.NitrateMgL = aux.LegacyNitrate
	}
	if w.AmmoniumMgL == nil {
		w.AmmoniumMgL = aux.LegacyAmmonium
	}
	if w.CO2MgL == nil {
		w.CO2MgL = aux.LegacyCO2
	}
	return nil
}

// RuleMatch is a single rule engine outcome before persistence.
type RuleMatch struct {
	RuleID          string   `json:"rule_id"`
	Name            string   `json:"name,omitempty"`
	DiagnosisType   string   `json:"diagnosis_type"`
	Confidence      float64  `json:"confidence"`
	Severity        string   `json:"severity"`
	ActionsNow      []string `json:"actions_now"`
	ActionsOptional []string `json:"actions_optional"`
	Avoid           []string `json:"avoid"`
	Facts           []string `json:"facts"`
	SummaryDE       string   `json:"-"`
	ReasoningDE     string   `json:"-"`
	FollowUpDE      []string `json:"-"`
	SafetyNoteDE    string   `json:"-"`
}

// DiagnosisItem is one matched rule in the API response (diagnoses[] / top_diagnosis).
type DiagnosisItem struct {
	RuleID            string   `json:"rule_id"`
	Name              string   `json:"name"`
	DiagnosisType     string   `json:"diagnosis_type"`
	Severity          string   `json:"severity"`
	Confidence        float64  `json:"confidence"`
	SummaryDE         string   `json:"summary_de"`
	ReasoningDE       string   `json:"reasoning_de"`
	ActionsNow        []string `json:"actions_now"`
	ActionsOptional   []string `json:"actions_optional"`
	Avoid             []string `json:"avoid"`
	FollowUpQuestions []string `json:"follow_up_questions_de"`
	SafetyNoteDE      string   `json:"safety_note_de"`
	Facts             []string `json:"facts"`
}

// DiagnosisItemFromRuleMatch maps engine output to API shape.
func DiagnosisItemFromRuleMatch(m RuleMatch) DiagnosisItem {
	return DiagnosisItem{
		RuleID:            m.RuleID,
		Name:              m.Name,
		DiagnosisType:     m.DiagnosisType,
		Severity:          m.Severity,
		Confidence:        m.Confidence,
		SummaryDE:         m.SummaryDE,
		ReasoningDE:       m.ReasoningDE,
		ActionsNow:        append([]string(nil), m.ActionsNow...),
		ActionsOptional:   append([]string(nil), m.ActionsOptional...),
		Avoid:             append([]string(nil), m.Avoid...),
		FollowUpQuestions: append([]string(nil), m.FollowUpDE...),
		SafetyNoteDE:      m.SafetyNoteDE,
		Facts:             append([]string(nil), m.Facts...),
	}
}

// Status values for DiagnoseAPIResponse.Status.
const (
	StatusMatched = "matched"
	StatusUnknown = "unknown"
)

// DiagnosisResultRow is the persistence shape for diagnosis_results.
type DiagnosisResultRow struct {
	WaterTestID         int64
	DiagnosisType       string
	Confidence          float64
	Severity            string
	ActionsNowJSON      string
	ActionsOptionalJSON string
	AvoidJSON           string
	FactsJSON           string
	MatchedRuleIDsJSON  string
	RunnerUpJSON        string
	ExplanationJSON     string
	// JSON text for column follow_up_answers_json; POST may store an array of
	// {"question","answer"} objects; PATCH may replace with {"0":"…"} objects.
	FollowUpAnswersJSON string
}

// DiagnoseAPIResponse is the stabilized POST /v1/diagnose response.
//
// The shape is fixed: status, top_diagnosis, diagnoses, matched_rules and meta
// are always present. diagnoses and matched_rules are always arrays (never null),
// and top_diagnosis is null when no rule matched.
type DiagnoseAPIResponse struct {
	// Status is StatusMatched when at least one rule matched, otherwise StatusUnknown.
	Status string `json:"status"`

	// TopDiagnosis is &Diagnoses[0] after confidence sort; null when no rule matched.
	TopDiagnosis *DiagnosisItem `json:"top_diagnosis"`

	Diagnoses    []DiagnosisItem `json:"diagnoses"`
	MatchedRules []string        `json:"matched_rules"`

	// AIExplanation is optional. When AI is disabled or failed, it is null and
	// the deterministic diagnosis fields remain the source of truth.
	AIExplanation *AIExplanation `json:"ai_explanation"`

	Meta DiagnosisMeta `json:"meta"`
}

// DiagnosisMeta is the response metadata block. GeneratedAt is RFC3339.
type DiagnosisMeta struct {
	RuleEngineVersion string `json:"rule_engine_version"`
	EvaluatedRules    int    `json:"evaluated_rules"`
	MatchedCount      int    `json:"matched_count"`
	GeneratedAt       string `json:"generated_at"`

	// AIStatus describes if an AI explanation was attempted.
	// Values: "disabled" | "ok" | "failed"
	AIStatus string `json:"ai_status"`

	// AIErrorCode is a development-only, normalized error indicator for AI failures.
	// It is intentionally omitted in production.
	AIErrorCode *string `json:"ai_error_code,omitempty"`

	// Persistence references for the produced diagnosis. Kept inside meta so the
	// top-level response shape stays exactly as documented.
	DiagnosisID int64 `json:"diagnosis_id"`
	WaterTestID int64 `json:"water_test_id"`
	TankID      int64 `json:"tank_id"`
}

// BuildDiagnoseResponse builds the API response from confidence-sorted matches and a prefilled meta.
// MatchedCount is set from len(matches); the caller does not have to compute it.
func BuildDiagnoseResponse(matches []RuleMatch, meta DiagnosisMeta) DiagnoseAPIResponse {
	meta.MatchedCount = len(matches)
	out := DiagnoseAPIResponse{
		Diagnoses:     make([]DiagnosisItem, 0, len(matches)),
		MatchedRules:  make([]string, 0, len(matches)),
		AIExplanation: nil,
		Meta:          meta,
	}
	if len(matches) == 0 {
		out.Status = StatusUnknown
		out.TopDiagnosis = nil
		return out
	}
	out.Status = StatusMatched
	for _, m := range matches {
		out.Diagnoses = append(out.Diagnoses, DiagnosisItemFromRuleMatch(m))
	}
	for _, d := range out.Diagnoses {
		out.MatchedRules = append(out.MatchedRules, d.RuleID)
	}
	out.TopDiagnosis = &out.Diagnoses[0]
	return out
}

// RunnerUpItem summarizes secondary matches.
type RunnerUpItem struct {
	RuleID        string  `json:"rule_id"`
	DiagnosisType string  `json:"diagnosis_type"`
	Confidence    float64 `json:"confidence"`
	Severity      string  `json:"severity"`
}

// Explanation is the user-facing text layer (deterministic or AI-shaped).
type Explanation struct {
	Summary           string   `json:"summary"`
	ReasoningPublic   string   `json:"reasoning_public"`
	ActionsNow        []string `json:"actions_now"`
	ActionsOptional   []string `json:"actions_optional"`
	Avoid             []string `json:"avoid"`
	FollowUpQuestions []string `json:"follow_up_questions"`
	SafetyNote        string   `json:"safety_note"`

	Source string `json:"source"` // "deterministic" | "ai"
}

// AIExplanation is the optional explanation layer returned by the AI service.
// It must never change or override any deterministic diagnosis fields.
type AIExplanation struct {
	Summary           string   `json:"summary"`
	ReasoningPublic   string   `json:"reasoning_public"`
	ActionsNow        []string `json:"actions_now"`
	ActionsOptional   []string `json:"actions_optional"`
	Avoid             []string `json:"avoid"`
	FollowUpQuestions []string `json:"follow_up_questions"`
	SafetyNote        string   `json:"safety_note"`
}
