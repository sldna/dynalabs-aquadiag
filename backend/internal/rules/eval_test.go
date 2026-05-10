package rules

import (
	"path/filepath"
	"testing"
)

func rulesPath(t *testing.T) string {
	t.Helper()
	return filepath.Clean(filepath.Join("..", "..", "..", "rules", "aquarium-rules.yaml"))
}

func mustRules(t *testing.T) Ruleset {
	t.Helper()
	rs, err := LoadFile(rulesPath(t))
	if err != nil {
		t.Fatal(err)
	}
	return rs
}

func TestLoadFile_V1AquariumRules(t *testing.T) {
	rs := mustRules(t)
	if rs.Version != 1 {
		t.Fatalf("version=%d", rs.Version)
	}
	if len(rs.Rules) == 0 {
		t.Fatal("no rules")
	}
}

func TestEvaluate_NitriteGte025_MatchesNitriteRiskV1(t *testing.T) {
	rs := mustRules(t)
	n := 0.25
	in := EvalInput{NitriteMgL: &n}
	matches := rs.Evaluate(in)
	if len(matches) == 0 || matches[0].RuleID != "nitrite_poisoning_v1" {
		t.Fatalf("matches=%v", matches)
	}
}

func TestEvaluate_SymptomMilkyWater_MatchesBacterialBloomV1(t *testing.T) {
	rs := mustRules(t)
	in := EvalInput{Symptoms: []string{"milky_water"}}
	matches := rs.Evaluate(in)
	var got bool
	for _, m := range matches {
		if m.RuleID == "bacterial_bloom_v1" {
			got = true
			break
		}
	}
	if !got {
		t.Fatalf("expected bacterial_bloom_v1 among matches, got %v", matches)
	}
}

func TestEvaluate_Nitrate40AndGreenWater_MatchesAlgaeBloomV1(t *testing.T) {
	rs := mustRules(t)
	n := 40.0
	in := EvalInput{
		NitrateMgL: &n,
		Symptoms:   []string{"green_water"},
	}
	matches := rs.Evaluate(in)
	if len(matches) == 0 || matches[0].RuleID != "algae_excess_v1" {
		t.Fatalf("matches=%v", matches)
	}
}

func TestEvaluate_OxygenMgLLte55_MatchesOxygenRiskV1(t *testing.T) {
	rs := mustRules(t)
	o := 5.5
	in := EvalInput{OxygenMgL: &o}
	matches := rs.Evaluate(in)
	var got bool
	for _, m := range matches {
		if m.RuleID == "oxygen_deficiency_v1" {
			got = true
			break
		}
	}
	if !got {
		t.Fatalf("expected oxygen_deficiency_v1 among matches, got %v", matches)
	}
}

func TestEvaluate_CO2MgLGte30_MatchesCO2PhKhRiskV1(t *testing.T) {
	rs := mustRules(t)
	co2 := 30.0
	in := EvalInput{CO2MgL: &co2}
	matches := rs.Evaluate(in)
	var got bool
	for _, m := range matches {
		if m.RuleID == "co2_overdose_v1" {
			got = true
			break
		}
	}
	if !got {
		t.Fatalf("expected co2_overdose_v1 among matches, got %v", matches)
	}
}

func TestEvaluate_PHKHWithoutCO2Symptom_DoesNotMatchCo2PhKhRiskV1(t *testing.T) {
	rs := mustRules(t)
	ph := 6.6
	kh := 3.0
	in := EvalInput{
		PH:       &ph,
		KhDKH:    &kh,
		Symptoms: nil,
	}
	for _, m := range rs.Evaluate(in) {
		if m.RuleID == "co2_overdose_v1" {
			t.Fatalf("co2_overdose_v1 should not match without CO2-related symptom / CO2 measurement, got match: %+v", m)
		}
	}
}

func TestEvaluate_EmptyInput_NoPanicAndNoMatch(t *testing.T) {
	rs := mustRules(t)
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("panic: %v", r)
		}
	}()
	in := EvalInput{}
	if ms := rs.Evaluate(in); len(ms) != 0 {
		t.Fatalf("expected no rules matched, got %d", len(ms))
	}
}

func TestEvaluate_MissingNumericField_ConditionFalseNoPanic(t *testing.T) {
	rs := mustRules(t)
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("panic: %v", r)
		}
	}()
	in := EvalInput{Symptoms: []string{"green_water"}}
	for _, m := range rs.Evaluate(in) {
		if m.RuleID == "nitrite_poisoning_v1" {
			t.Fatalf("nitrite_poisoning_v1 should not match without nitrite_mg_l")
		}
	}
}

func TestEvaluate_SortedByConfidenceDescending(t *testing.T) {
	y := `version: 1
rules:
  - id: rule_low
    name: Low
    diagnosis_type: a
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: nitrite_mg_l
      gte: 0.1
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: rule_high
    name: High
    diagnosis_type: b
    severity: low
    confidence: 0.9
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: nitrite_mg_l
      gte: 0.1
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	rs, err := Parse([]byte(y))
	if err != nil {
		t.Fatal(err)
	}
	n := 0.2
	matches := rs.Evaluate(EvalInput{NitriteMgL: &n})
	if len(matches) != 2 {
		t.Fatalf("len=%d", len(matches))
	}
	if matches[0].RuleID != "rule_high" || matches[1].RuleID != "rule_low" {
		t.Fatalf("order: %v, %v", matches[0].RuleID, matches[1].RuleID)
	}
}

func TestEvalOperators_EqNeqContains(t *testing.T) {
	y := `version: 1
rules:
  - id: eq_rule
    name: N
    diagnosis_type: eq_t
    severity: low
    confidence: 1
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: ph
      eq: 7.0
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: neq_rule
    name: N2
    diagnosis_type: neq_t
    severity: low
    confidence: 1
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: ph
      neq: 8.0
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: sym_rule
    name: N3
    diagnosis_type: sym_t
    severity: low
    confidence: 1
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: symptoms
      contains: foo_bar
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	rs, err := Parse([]byte(y))
	if err != nil {
		t.Fatal(err)
	}
	p := 7.0
	if ms := rs.Evaluate(EvalInput{PH: &p}); len(ms) != 2 {
		t.Fatalf("eq+neq: got %d matches", len(ms))
	}
	p2 := 8.0
	if ms := rs.Evaluate(EvalInput{PH: &p2}); len(ms) != 0 {
		t.Fatalf("ph 8 should fail eq and fail neq(8): %v", ms)
	}
	if ms := rs.Evaluate(EvalInput{Symptoms: []string{"foo_bar"}}); len(ms) != 1 || ms[0].DiagnosisType != "sym_t" {
		t.Fatalf("contains: %v", ms)
	}
}
