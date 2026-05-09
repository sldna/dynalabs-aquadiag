package rules

import (
	"strings"
	"testing"
)

func TestIsValidSeverity_AcceptsAllowedSet(t *testing.T) {
	for _, v := range AllowedSeverities {
		if !IsValidSeverity(string(v)) {
			t.Fatalf("expected %q to be valid", v)
		}
	}
}

func TestIsValidSeverity_RejectsUnknownAndCaseVariants(t *testing.T) {
	cases := []string{"", " ", "High", "HIGH", "warning", "danger", "minor"}
	for _, s := range cases {
		if IsValidSeverity(s) {
			t.Fatalf("expected %q to be invalid", s)
		}
	}
}

func TestParse_RejectsInvalidSeverity(t *testing.T) {
	y := `version: 1
rules:
  - id: bad_rule
    name: Bad
    diagnosis_type: bad
    severity: warning
    confidence: 0.5
    when:
      field: nitrite_mg_l
      gte: 0.1
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil {
		t.Fatal("expected error for invalid severity, got nil")
	}
	msg := err.Error()
	if !strings.Contains(msg, "bad_rule") || !strings.Contains(msg, "warning") {
		t.Fatalf("error should name rule and bad value, got: %v", err)
	}
	if !strings.Contains(msg, "info") || !strings.Contains(msg, "critical") {
		t.Fatalf("error should list allowed severities, got: %v", err)
	}
}

func TestParse_RejectsMissingSeverity(t *testing.T) {
	y := `version: 1
rules:
  - id: missing_sev
    name: NoSev
    diagnosis_type: x
    confidence: 0.5
    when:
      field: nitrite_mg_l
      gte: 0.1
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil {
		t.Fatal("expected error for missing severity, got nil")
	}
	if !strings.Contains(err.Error(), "missing_sev") {
		t.Fatalf("error should name offending rule id, got: %v", err)
	}
}

func TestParse_AcceptsAllAllowedSeverities(t *testing.T) {
	y := `version: 1
rules:
  - id: r_info
    name: I
    diagnosis_type: t
    severity: info
    confidence: 0.1
    when: { field: nitrite_mg_l, gte: 0.1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: r_low
    name: L
    diagnosis_type: t
    severity: low
    confidence: 0.1
    when: { field: nitrite_mg_l, gte: 0.1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: r_medium
    name: M
    diagnosis_type: t
    severity: medium
    confidence: 0.1
    when: { field: nitrite_mg_l, gte: 0.1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: r_high
    name: H
    diagnosis_type: t
    severity: high
    confidence: 0.1
    when: { field: nitrite_mg_l, gte: 0.1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: r_critical
    name: C
    diagnosis_type: t
    severity: critical
    confidence: 0.1
    when: { field: nitrite_mg_l, gte: 0.1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	rs, err := Parse([]byte(y))
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(rs.Rules) != len(AllowedSeverities) {
		t.Fatalf("rules=%d", len(rs.Rules))
	}
}

func TestLoadFile_ProductionRulesUseAllowedSeverities(t *testing.T) {
	rs := mustRules(t)
	for _, r := range rs.Rules {
		if r.ID == "" {
			continue
		}
		if !IsValidSeverity(r.Severity) {
			t.Fatalf("rule %q has invalid severity %q (allowed: %s)", r.ID, r.Severity, allowedSeveritiesList())
		}
	}
}
