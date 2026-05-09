package models

import "testing"

func TestBuildDiagnoseResponse_EmptyUnknown(t *testing.T) {
	meta := DiagnosisMeta{
		RuleEngineVersion: "1",
		EvaluatedRules:    5,
		GeneratedAt:       "2026-05-08T12:00:00Z",
	}
	p := BuildDiagnoseResponse(nil, meta)
	if p.Status != StatusUnknown {
		t.Fatalf("status=%q", p.Status)
	}
	if p.TopDiagnosis != nil {
		t.Fatalf("top_diagnosis=%v", p.TopDiagnosis)
	}
	if p.Diagnoses == nil || len(p.Diagnoses) != 0 {
		t.Fatalf("diagnoses must be empty array, got %v", p.Diagnoses)
	}
	if p.MatchedRules == nil || len(p.MatchedRules) != 0 {
		t.Fatalf("matched_rules must be empty array, got %v", p.MatchedRules)
	}
	if p.Meta.MatchedCount != 0 {
		t.Fatalf("matched_count=%d", p.Meta.MatchedCount)
	}
	if p.Meta.RuleEngineVersion != "1" || p.Meta.EvaluatedRules != 5 {
		t.Fatalf("meta=%+v", p.Meta)
	}

	p2 := BuildDiagnoseResponse([]RuleMatch{}, meta)
	if p2.Status != StatusUnknown {
		t.Fatalf("status=%q", p2.Status)
	}
}

func TestBuildDiagnoseResponse_TopIsDiagnosesFirst(t *testing.T) {
	matches := []RuleMatch{
		{RuleID: "rule_high", Name: "H", DiagnosisType: "a", Severity: "low", Confidence: 0.9, SummaryDE: "s"},
		{RuleID: "rule_low", Name: "L", DiagnosisType: "b", Severity: "low", Confidence: 0.5},
	}
	meta := DiagnosisMeta{
		RuleEngineVersion: "1",
		EvaluatedRules:    7,
		GeneratedAt:       "2026-05-08T12:00:00Z",
	}
	p := BuildDiagnoseResponse(matches, meta)
	if p.Status != StatusMatched {
		t.Fatalf("status=%q", p.Status)
	}
	if len(p.Diagnoses) != 2 || p.MatchedRules[0] != "rule_high" || p.MatchedRules[1] != "rule_low" {
		t.Fatalf("diagnoses/matched: %+v", p)
	}
	if p.TopDiagnosis == nil || p.TopDiagnosis.RuleID != "rule_high" {
		t.Fatalf("top=%v", p.TopDiagnosis)
	}
	if &p.Diagnoses[0] != p.TopDiagnosis {
		t.Fatal("top_diagnosis must be pointer to diagnoses[0]")
	}
	if p.Meta.MatchedCount != 2 {
		t.Fatalf("matched_count=%d", p.Meta.MatchedCount)
	}
	if p.Meta.EvaluatedRules != 7 {
		t.Fatalf("evaluated_rules=%d", p.Meta.EvaluatedRules)
	}
}
