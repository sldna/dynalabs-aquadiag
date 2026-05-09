package rules

import (
	"strings"
	"testing"
)

func TestParse_RejectsDuplicateRuleID(t *testing.T) {
	y := `version: 1
rules:
  - id: dup
    name: A
    diagnosis_type: a
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: ph, eq: 7 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
  - id: dup
    name: B
    diagnosis_type: b
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: ph, eq: 7 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "duplicate rule id") {
		t.Fatalf("want duplicate id error, got %v", err)
	}
}

func TestParse_RejectsEmptyDiagnosisType(t *testing.T) {
	y := `version: 1
rules:
  - id: nodiag
    name: X
    diagnosis_type: "   "
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: ph, eq: 7 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "diagnosis_type") {
		t.Fatalf("want diagnosis_type error, got %v", err)
	}
}

func TestParse_RejectsNumericOperatorsOnSymptoms(t *testing.T) {
	y := `version: 1
rules:
  - id: bad_sym
    name: X
    diagnosis_type: x
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: symptoms, gte: 1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "symptoms") {
		t.Fatalf("want symptoms operator error, got %v", err)
	}
}

func TestParse_RejectsStringOperatorsOnNumericField(t *testing.T) {
	y := `version: 1
rules:
  - id: bad_num
    name: X
    diagnosis_type: x
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: nitrite_mg_l, contains_any: [a, b] }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "cannot use string operators") {
		t.Fatalf("want string-op error on numeric field, got %v", err)
	}
}

func TestParse_RejectsUnknownField(t *testing.T) {
	y := `version: 1
rules:
  - id: bad_field
    name: X
    diagnosis_type: x
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: mystery_ppm, gte: 1 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "unknown field") {
		t.Fatalf("want unknown field error, got %v", err)
	}
}

func TestParse_RejectsWhenCombiningAllAndAny(t *testing.T) {
	y := `version: 1
rules:
  - id: mixed
    name: X
    diagnosis_type: x
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      all:
        - field: ph
          gte: 7
      any:
        - field: ph
          lte: 6
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "exactly one of not") {
		t.Fatalf("want mutually exclusive when error, got %v", err)
	}
}
