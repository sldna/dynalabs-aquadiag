package ai

import (
	"strings"
	"testing"

	"aquadiag/backend/internal/models"
)

func TestBuildUserPrompt_IncludesSecondaryDiagnoses(t *testing.T) {
	top := models.RuleMatch{
		RuleID:        "primary_rule",
		Name:          "Primary",
		DiagnosisType: "a",
		Severity:      "high",
		Confidence:    0.9,
		ActionsNow:    []string{"do a"},
		Avoid:         []string{"avoid x"},
		FollowUpDE:    []string{"q1"},
		SummaryDE:     "s1",
		ReasoningDE:   "r1",
		SafetyNoteDE:  "safe",
	}
	secondary := models.RuleMatch{
		RuleID:        "secondary_rule",
		Name:          "Secondary",
		DiagnosisType: "b",
		Severity:      "medium",
		Confidence:    0.6,
		ActionsNow:    []string{"do b"},
		Avoid:         []string{"avoid y"},
		FollowUpDE:    []string{"q2"},
		SummaryDE:     "s2",
		ReasoningDE:   "r2",
		SafetyNoteDE:  "safe2",
	}

	p, err := BuildUserPrompt(top, []models.RuleMatch{top, secondary}, []string{"primary_rule", "secondary_rule"}, nil)
	if err != nil {
		t.Fatal(err)
	}

	if !strings.Contains(p, `"matched_rules"`) {
		t.Fatalf("prompt missing matched_rules: %s", p)
	}
	if !strings.Contains(p, `"secondary_rule"`) {
		t.Fatalf("prompt missing secondary rule id: %s", p)
	}
	if !strings.Contains(p, `"diagnoses"`) {
		t.Fatalf("prompt missing diagnoses array: %s", p)
	}
}

func TestBuildUserPrompt_IncludesAquariumContext(t *testing.T) {
	top := models.RuleMatch{
		RuleID:          "r1",
		Name:            "R1",
		DiagnosisType:   "x",
		Severity:        "low",
		Confidence:      0.5,
		SummaryDE:       "s",
		ReasoningDE:     "r",
		SafetyNoteDE:    "",
		FollowUpDE:      nil,
		ActionsNow:      nil,
		ActionsOptional: nil,
		Avoid:           nil,
		Facts:           nil,
	}
	days := 42
	filter := true
	ctx := &models.DiagnosisContext{
		TankAgeDays:          &days,
		RecentFilterCleaning: &filter,
	}
	p, err := BuildUserPrompt(top, []models.RuleMatch{top}, []string{"r1"}, ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(p, `"aquarium_context"`) {
		t.Fatalf("missing aquarium_context: %s", p)
	}
	if !strings.Contains(p, `"tank_age_days"`) || !strings.Contains(p, `"recent_filter_cleaning"`) {
		t.Fatalf("missing context keys: %s", p)
	}
}
