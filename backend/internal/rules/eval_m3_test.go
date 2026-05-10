package rules

import (
	"slices"
	"testing"
)

func TestM3_HighNitrite_RanksNitritePoisoningFirst(t *testing.T) {
	rs := mustRules(t)
	n := 0.8
	matches := rs.Evaluate(EvalInput{NitriteMgL: &n})
	if len(matches) == 0 || matches[0].RuleID != "nitrite_poisoning_v1" {
		t.Fatalf("matches=%v", matches)
	}
	if matches[0].ScoreBreakdown == nil {
		t.Fatal("expected score_breakdown")
	}
	if matches[0].ScoreBreakdown.WaterBonuses == nil {
		t.Fatal("expected water_boosts for high nitrite")
	}
}

func TestM3_WhiteSpots_RanksIchFirst(t *testing.T) {
	rs := mustRules(t)
	in := EvalInput{Symptoms: []string{"white_spots"}}
	matches := rs.Evaluate(in)
	if len(matches) == 0 || matches[0].RuleID != "ich_white_spot_v1" {
		t.Fatalf("matches=%v", matches)
	}
	if matches[0].DiagnosisType != "ich_white_spot" {
		t.Fatalf("got %q", matches[0].DiagnosisType)
	}
	if !slices.Contains(matches[0].MatchedSymptoms, "white_spots") {
		t.Fatalf("matched_symptoms=%v", matches[0].MatchedSymptoms)
	}
	if matches[0].ScoreBreakdown == nil {
		t.Fatal("expected score_breakdown")
	}
}

func TestM3_FrayedFins_RanksFinRotFirst(t *testing.T) {
	rs := mustRules(t)
	in := EvalInput{Symptoms: []string{"frayed_fins"}}
	matches := rs.Evaluate(in)
	if len(matches) == 0 || matches[0].RuleID != "fin_rot_v1" {
		t.Fatalf("matches=%v", matches)
	}
}

func TestM3_NitriteExcludeIf_ExcludesLowNitriteWithGasping(t *testing.T) {
	rs := mustRules(t)
	n := 0.07
	in := EvalInput{NitriteMgL: &n, Symptoms: []string{"gasping"}}
	ev := rs.EvaluateWithMeta(in)
	for _, m := range ev.Matches {
		if m.RuleID == "nitrite_poisoning_v1" {
			t.Fatalf("nitrite_poisoning should be suppressed, got match %+v", m)
		}
	}
	var hit bool
	for _, e := range ev.Excluded {
		if e.RuleID == "nitrite_poisoning_v1" && e.Reason == "exclude_if" {
			hit = true
			break
		}
	}
	if !hit {
		t.Fatalf("expected excluded nitrite_poisoning_v1 with exclude_if, excluded=%v matches=%v", ev.Excluded, ev.Matches)
	}
}

func TestM3_ParasiteSuspected_ExcludedWhenWhiteSpotsPresent(t *testing.T) {
	rs := mustRules(t)
	in := EvalInput{Symptoms: []string{"white_spots", "flashing", "clamped_fins"}}
	ev := rs.EvaluateWithMeta(in)
	for _, m := range ev.Matches {
		if m.RuleID == "parasite_suspected_v1" {
			t.Fatalf("parasite rule should be excluded when white_spots present, got %+v", m)
		}
	}
	var hit bool
	for _, e := range ev.Excluded {
		if e.RuleID == "parasite_suspected_v1" && e.Reason == "exclude_symptoms" {
			hit = true
			break
		}
	}
	if !hit {
		t.Fatalf("expected parasite excluded, excluded=%v", ev.Excluded)
	}
}

func TestM3_MatchedWaterValues_ForNitriteInput(t *testing.T) {
	rs := mustRules(t)
	n := 0.5
	matches := rs.Evaluate(EvalInput{NitriteMgL: &n})
	if len(matches) == 0 {
		t.Fatal("no matches")
	}
	top := matches[0]
	if top.RuleID != "nitrite_poisoning_v1" {
		t.Fatalf("top=%q", top.RuleID)
	}
	if len(top.MatchedWaterValues) == 0 {
		t.Fatalf("want matched water values, got %#v", top.MatchedWaterValues)
	}
	found := false
	for _, w := range top.MatchedWaterValues {
		if w.Field == "nitrite_mg_l" && w.Value == n {
			found = true
		}
	}
	if !found {
		t.Fatalf("matched_water_values=%v", top.MatchedWaterValues)
	}
}
