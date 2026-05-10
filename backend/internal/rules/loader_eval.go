package rules

import (
	"fmt"
	"os"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"

	"aquadiag/backend/internal/models"
)

// Ruleset is the loaded YAML rule bundle.
type Ruleset struct {
	Version int    `yaml:"version"`
	Rules   []Rule `yaml:"rules"`
}

// WaterBoost adds confidence when a numeric leaf condition is satisfied.
type WaterBoost struct {
	When When    `yaml:"when"`
	Add  float64 `yaml:"add"`
}

// Rule is one deterministic diagnosis rule.
type Rule struct {
	ID              string             `yaml:"id"`
	Name            string             `yaml:"name"`
	Category        string             `yaml:"category,omitempty"`
	Tags            []string           `yaml:"tags,omitempty"`
	When            When               `yaml:"when"`
	ExcludeIf       *When              `yaml:"exclude_if,omitempty"`
	ExcludeSymptoms []string           `yaml:"exclude_symptoms,omitempty"`
	ConfidenceBase  *float64           `yaml:"confidence_base,omitempty"`
	SymptomWeights  map[string]float64 `yaml:"symptom_weights,omitempty"`
	WaterBoosts     []WaterBoost       `yaml:"water_boosts,omitempty"`
	MatchData       `yaml:",inline"`
}

// MatchData is copied into models.RuleMatch on success.
type MatchData struct {
	DiagnosisType   string   `yaml:"diagnosis_type"`
	Severity        string   `yaml:"severity"`
	Confidence      float64  `yaml:"confidence"`
	ActionsNow      []string `yaml:"actions_now"`
	ActionsOptional []string `yaml:"actions_optional"`
	Avoid           []string `yaml:"avoid"`
	Facts           []string `yaml:"facts"`
	SummaryDE       string   `yaml:"summary_de"`
	ReasoningDE     string   `yaml:"reasoning_de"`
	FollowUpDE      []string `yaml:"follow_up_questions_de"`
	SafetyNoteDE    string   `yaml:"safety_note_de"`
	ExplanationDE   string   `yaml:"explanation_de,omitempty"`
}

// When is a nested condition tree (all / any / not) or a leaf with field + operators.
type When struct {
	All []When `yaml:"all,omitempty"`
	Any []When `yaml:"any,omitempty"`
	Not *When  `yaml:"not,omitempty"`

	Field string `yaml:"field,omitempty"`

	Eq  *float64 `yaml:"eq,omitempty"`
	Neq *float64 `yaml:"neq,omitempty"`
	Gt  *float64 `yaml:"gt,omitempty"`
	Gte *float64 `yaml:"gte,omitempty"`
	Lt  *float64 `yaml:"lt,omitempty"`
	Lte *float64 `yaml:"lte,omitempty"`

	Contains    *string  `yaml:"contains,omitempty"`
	ContainsAny []string `yaml:"contains_any,omitempty"`
	ContainsAll []string `yaml:"contains_all,omitempty"`
}

// LoadFile reads and parses YAML rules from a filesystem path.
func LoadFile(path string) (Ruleset, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return Ruleset{}, fmt.Errorf("rules file: %w", err)
	}
	return Parse(b)
}

// Parse decodes rule YAML bytes and validates structural invariants
// (version present, severity values within AllowedSeverities). A failed
// validation aborts startup with a deterministic error.
func Parse(data []byte) (Ruleset, error) {
	var rs Ruleset
	if err := yaml.Unmarshal(data, &rs); err != nil {
		return Ruleset{}, fmt.Errorf("rules yaml: %w", err)
	}
	if rs.Version == 0 {
		return Ruleset{}, fmt.Errorf("rules: missing version")
	}
	if err := validateRuleset(rs); err != nil {
		return Ruleset{}, fmt.Errorf("rules: %w", err)
	}
	return rs, nil
}

// EvalInput is the fact set used for rule evaluation (Konzentrationen in mg/l).
type EvalInput struct {
	PH                  *float64
	KhDKH               *float64
	GhDGH               *float64
	TempC               *float64
	NitriteMgL          *float64
	NitrateMgL          *float64
	AmmoniumMgL         *float64
	OxygenMgL           *float64
	OxygenSaturationPct *float64
	CO2MgL              *float64
	Symptoms            []string
}

// FromDiagnoseRequest maps API input to EvalInput (symptoms normalized).
func FromDiagnoseRequest(w models.WaterTestInput, symptoms []string) EvalInput {
	sx := make([]string, 0, len(symptoms))
	for _, s := range symptoms {
		s = strings.TrimSpace(strings.ToLower(s))
		if s != "" {
			sx = append(sx, s)
		}
	}
	return EvalInput{
		PH:                  w.PH,
		KhDKH:               w.KhDKH,
		GhDGH:               w.GhDGH,
		TempC:               w.TempC,
		NitriteMgL:          w.NitriteMgL,
		NitrateMgL:          w.NitrateMgL,
		AmmoniumMgL:         w.AmmoniumMgL,
		OxygenMgL:           w.OxygenMgL,
		OxygenSaturationPct: w.OxygenSaturationPct,
		CO2MgL:              w.CO2MgL,
		Symptoms:            sx,
	}
}

// EvaluatedCount returns the number of rules the engine actually considers
// (rules with a non-empty ID). Rules without an ID are skipped during Evaluate
// and therefore are not counted as evaluated.
func (rs Ruleset) EvaluatedCount() int {
	n := 0
	for _, r := range rs.Rules {
		if r.ID != "" {
			n++
		}
	}
	return n
}

// EvalOutcome is the full deterministic evaluation result including suppressed rules.
type EvalOutcome struct {
	Matches  []models.RuleMatch
	Excluded []models.ExcludedRule
}

// Evaluate runs every rule in the ruleset, appends each match to the result slice (no early exit),
// then sorts by confidence descending and rule_id ascending. Matches are never merged or overwritten.
func (rs Ruleset) Evaluate(in EvalInput) []models.RuleMatch {
	return rs.EvaluateWithMeta(in).Matches
}

// EvaluateWithMeta evaluates all rules, applies exclusion and scoring, and returns matches plus exclusions.
func (rs Ruleset) EvaluateWithMeta(in EvalInput) EvalOutcome {
	var out []models.RuleMatch
	var excluded []models.ExcludedRule
	for _, r := range rs.Rules {
		if r.ID == "" {
			continue
		}
		if !evalWhen(r.When, in) {
			continue
		}
		if hasExcludedSymptomOverlap(in.Symptoms, r.ExcludeSymptoms) {
			excluded = append(excluded, models.ExcludedRule{
				RuleID:        r.ID,
				DiagnosisType: r.DiagnosisType,
				Reason:        "exclude_symptoms",
			})
			continue
		}
		if r.ExcludeIf != nil && evalWhen(*r.ExcludeIf, in) {
			excluded = append(excluded, models.ExcludedRule{
				RuleID:        r.ID,
				DiagnosisType: r.DiagnosisType,
				Reason:        "exclude_if",
			})
			continue
		}
		rm := buildRuleMatch(r, in)
		out = append(out, rm)
	}
	sortMatches(out)
	return EvalOutcome{Matches: out, Excluded: excluded}
}

func buildRuleMatch(r Rule, in EvalInput) models.RuleMatch {
	reasoning := strings.TrimSpace(r.ReasoningDE)
	if reasoning == "" {
		reasoning = strings.TrimSpace(r.ExplanationDE)
	}
	base := ruleBaseConfidence(r)
	sb, matchedSyms, matchedWater, conditions := computeExtras(r, in, base)

	conf := base
	if sb != nil {
		conf = sb.CappedTotal
	}

	return models.RuleMatch{
		RuleID:             r.ID,
		Name:               strings.TrimSpace(r.Name),
		Category:           strings.TrimSpace(r.Category),
		Tags:               append([]string(nil), r.Tags...),
		DiagnosisType:      r.DiagnosisType,
		Confidence:         clamp01(conf),
		Severity:           r.Severity,
		ActionsNow:         append([]string(nil), r.ActionsNow...),
		ActionsOptional:    append([]string(nil), r.ActionsOptional...),
		Avoid:              append([]string(nil), r.Avoid...),
		Facts:              append([]string(nil), r.Facts...),
		MatchedConditions:  conditions,
		MatchedSymptoms:    matchedSyms,
		MatchedWaterValues: matchedWater,
		ScoreBreakdown:     sb,
		SummaryDE:          strings.TrimSpace(r.SummaryDE),
		ReasoningDE:        reasoning,
		FollowUpDE:         append([]string(nil), r.FollowUpDE...),
		SafetyNoteDE:       strings.TrimSpace(r.SafetyNoteDE),
	}
}

func clamp01(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 1 {
		return 1
	}
	return x
}

func sortMatches(ms []models.RuleMatch) {
	sort.Slice(ms, func(i, j int) bool {
		a, b := ms[i], ms[j]
		if a.Confidence != b.Confidence {
			return a.Confidence > b.Confidence
		}
		return a.RuleID < b.RuleID
	})
}

func hasNumericComparator(w When) bool {
	return w.Eq != nil || w.Neq != nil || w.Gt != nil || w.Gte != nil ||
		w.Lt != nil || w.Lte != nil
}

func hasStringComparator(w When) bool {
	return w.Contains != nil || len(w.ContainsAny) > 0 || len(w.ContainsAll) > 0
}

func evalWhen(w When, in EvalInput) bool {
	if w.Not != nil {
		return !evalWhen(*w.Not, in)
	}
	if len(w.All) > 0 {
		for _, c := range w.All {
			if !evalWhen(c, in) {
				return false
			}
		}
		return true
	}
	if len(w.Any) > 0 {
		for _, c := range w.Any {
			if evalWhen(c, in) {
				return true
			}
		}
		return false
	}
	return evalLeaf(w, in)
}

func evalLeaf(w When, in EvalInput) bool {
	field := strings.TrimSpace(strings.ToLower(w.Field))
	if field == "" {
		return false
	}
	num := hasNumericComparator(w)
	str := hasStringComparator(w)

	if field == "symptoms" {
		if num {
			return false
		}
		return evalSymptomsField(w, in.Symptoms)
	}
	if str {
		return false
	}
	return evalNumericLeaf(field, w, in)
}

func evalNumericLeaf(field string, w When, in EvalInput) bool {
	if !hasNumericComparator(w) {
		return false
	}
	v, ok := numericField(field, in)
	if !ok {
		return false
	}
	x := *v
	if w.Eq != nil && x != *w.Eq {
		return false
	}
	if w.Neq != nil && x == *w.Neq {
		return false
	}
	if w.Gt != nil && !(x > *w.Gt) {
		return false
	}
	if w.Gte != nil && !(x >= *w.Gte) {
		return false
	}
	if w.Lt != nil && !(x < *w.Lt) {
		return false
	}
	if w.Lte != nil && !(x <= *w.Lte) {
		return false
	}
	return true
}

func normSym(s string) string {
	return strings.TrimSpace(strings.ToLower(s))
}

func evalSymptomsField(w When, have []string) bool {
	if !hasStringComparator(w) {
		return false
	}
	haveSet := make(map[string]struct{}, len(have))
	for _, s := range have {
		s = normSym(s)
		if s != "" {
			haveSet[s] = struct{}{}
		}
	}
	if w.Contains != nil {
		c := normSym(*w.Contains)
		if c == "" {
			return false
		}
		if _, ok := haveSet[c]; !ok {
			return false
		}
	}
	if len(w.ContainsAny) > 0 {
		okAny := false
		for _, s := range w.ContainsAny {
			if _, found := haveSet[normSym(s)]; found {
				okAny = true
				break
			}
		}
		if !okAny {
			return false
		}
	}
	if len(w.ContainsAll) > 0 {
		for _, s := range w.ContainsAll {
			if _, found := haveSet[normSym(s)]; !found {
				return false
			}
		}
	}
	return true
}

func isNumericRuleField(field string) bool {
	switch field {
	case "ph":
		return true
	case "kh_dkh", "kh":
		return true
	case "gh_dgh", "gh":
		return true
	case "temp_c":
		return true
	case "nitrite_mg_l", "nitrite_ppm":
		return true
	case "nitrate_mg_l", "nitrate_ppm":
		return true
	case "ammonium_mg_l", "ammonia_ppm":
		return true
	case "oxygen_mg_l", "o2_mg_l":
		return true
	case "oxygen_saturation_pct", "o2_sat_pct":
		return true
	case "co2_mg_l", "co2_ppm":
		return true
	default:
		return false
	}
}

func numericField(field string, in EvalInput) (*float64, bool) {
	if !isNumericRuleField(field) {
		return nil, false
	}
	switch field {
	case "ph":
		return in.PH, in.PH != nil
	case "kh_dkh", "kh":
		return in.KhDKH, in.KhDKH != nil
	case "gh_dgh", "gh":
		return in.GhDGH, in.GhDGH != nil
	case "temp_c":
		return in.TempC, in.TempC != nil
	case "nitrite_mg_l", "nitrite_ppm":
		return in.NitriteMgL, in.NitriteMgL != nil
	case "nitrate_mg_l", "nitrate_ppm":
		return in.NitrateMgL, in.NitrateMgL != nil
	case "ammonium_mg_l", "ammonia_ppm":
		return in.AmmoniumMgL, in.AmmoniumMgL != nil
	case "oxygen_mg_l", "o2_mg_l":
		return in.OxygenMgL, in.OxygenMgL != nil
	case "oxygen_saturation_pct", "o2_sat_pct":
		return in.OxygenSaturationPct, in.OxygenSaturationPct != nil
	case "co2_mg_l", "co2_ppm":
		return in.CO2MgL, in.CO2MgL != nil
	default:
		return nil, false
	}
}
