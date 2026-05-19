package rules

import "testing"

// JBL-aligned regression: a typical community panel must not trigger diagnoses.
func TestEvaluate_JBLGreenPanel_NoDiagnosis(t *testing.T) {
	rs := mustRules(t)
	ph, kh, gh, no2, no3, nh4 := 8.0, 10.0, 15.0, 0.1, 25.0, 0.1
	in := EvalInput{
		PH:          &ph,
		KhDKH:       &kh,
		GhDGH:       &gh,
		NitriteMgL:  &no2,
		NitrateMgL:  &no3,
		AmmoniumMgL: &nh4,
	}
	if len(rs.Evaluate(in)) != 0 {
		t.Fatalf("expected no rule matches for green JBL panel, got %v", rs.Evaluate(in))
	}
}

func TestEvaluate_JBLNitrite06_StillCritical(t *testing.T) {
	rs := mustRules(t)
	no2 := 0.6
	matches := rs.Evaluate(EvalInput{NitriteMgL: &no2})
	if len(matches) == 0 || matches[0].RuleID != "nitrite_poisoning_v1" {
		t.Fatalf("matches=%v", matches)
	}
}

func TestEvaluate_JBLPH83_NoSymptoms_NoPHShock(t *testing.T) {
	rs := mustRules(t)
	ph := 8.3
	matches := rs.Evaluate(EvalInput{PH: &ph})
	for _, m := range matches {
		if m.RuleID == "ph_shock_v1" {
			t.Fatalf("ph_shock_v1 should not match pH 8.3 without symptoms, got %+v", m)
		}
	}
}
