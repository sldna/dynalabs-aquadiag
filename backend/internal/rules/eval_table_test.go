package rules

import (
	"strings"
	"testing"
)

func TestEvaluate_Table(t *testing.T) {
	phHigh := 8.0
	phMid := 7.4
	phLow := 6.0
	phNestedOK := 6.6
	nit40 := 40.0
	yShared := `version: 1
rules:
  - id: rule_any
    name: Any
    diagnosis_type: dt_any
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      any:
        - field: ph
          gte: 8.0
        - field: ph
          lte: 6.5
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []

  - id: rule_all
    name: All
    diagnosis_type: dt_all
    severity: low
    confidence: 0.6
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      all:
        - field: nitrate_mg_l
          gte: 40
        - field: symptoms
          contains_any: [green_water, algae_on_glass]
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []

  - id: rule_nested
    name: Nested
    diagnosis_type: dt_nested
    severity: low
    confidence: 0.7
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      any:
        - all:
            - field: ph
              lte: 6.6
            - field: symptoms
              contains_any: [fish_stress]
        - field: co2_mg_l
          gte: 99
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []

  - id: rule_contains_any
    name: CA
    diagnosis_type: dt_ca
    severity: low
    confidence: 0.55
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: symptoms
      contains_any: [alpha_sym, beta_sym]
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []

  - id: rule_missing_numeric
    name: Need nitrite
    diagnosis_type: dt_nit
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

  - id: rule_float_edge
    name: Float
    diagnosis_type: dt_float
    severity: low
    confidence: 0.42
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: temp_c
      gt: 24.5
      lt: 27.25
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []

  - id: rule_second_match
    name: Second
    diagnosis_type: dt_second
    severity: low
    confidence: 0.41
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      field: ph
      gte: 8.3
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`

	rs, err := Parse([]byte(yShared))
	if err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name    string
		in      EvalInput
		wantIDs []string
	}{
		{
			name:    "any_first_branch",
			in:      EvalInput{PH: &phHigh},
			wantIDs: []string{"rule_any"},
		},
		{
			name:    "any_second_branch",
			in:      EvalInput{PH: &phLow},
			wantIDs: []string{"rule_any"},
		},
		{
			name:    "any_middle_no_match",
			in:      EvalInput{PH: &phMid},
			wantIDs: nil,
		},
		{
			name: "all_both_true",
			in: EvalInput{
				NitrateMgL: &nit40,
				Symptoms:   []string{"green_water"},
			},
			wantIDs: []string{"rule_all"},
		},
		{
			name: "all_missing_symptom",
			in: EvalInput{
				NitrateMgL: &nit40,
				Symptoms:   nil,
			},
			wantIDs: nil,
		},
		{
			name: "nested_all_matches",
			in: EvalInput{
				PH:       &phNestedOK,
				Symptoms: []string{"fish_stress"},
			},
			wantIDs: []string{"rule_nested"},
		},
		{
			name: "nested_co2_branch",
			in: func() EvalInput {
				c := 99.0
				return EvalInput{CO2MgL: &c}
			}(),
			wantIDs: []string{"rule_nested"},
		},
		{
			name:    "contains_any_second_token",
			in:      EvalInput{Symptoms: []string{"beta_sym"}},
			wantIDs: []string{"rule_contains_any"},
		},
		{
			name:    "contains_any_none",
			in:      EvalInput{Symptoms: []string{"other"}},
			wantIDs: nil,
		},
		{
			name:    "missing_numeric_field",
			in:      EvalInput{Symptoms: []string{"x"}},
			wantIDs: nil,
		},
		{
			name: "float_between_bounds",
			in: func() EvalInput {
				tv := 25.75
				return EvalInput{TempC: &tv}
			}(),
			wantIDs: []string{"rule_float_edge"},
		},
		{
			name: "multiple_matches_sorted",
			in: func() EvalInput {
				p := 8.35
				return EvalInput{PH: &p}
			}(),
			wantIDs: []string{"rule_any", "rule_second_match"},
		},
		{
			name:    "empty_input_no_match",
			in:      EvalInput{},
			wantIDs: nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Fatalf("panic: %v", r)
				}
			}()
			got := rs.Evaluate(tc.in)
			ids := make([]string, len(got))
			for i := range got {
				ids[i] = got[i].RuleID
			}
			if len(tc.wantIDs) != len(ids) {
				t.Fatalf("match count: got %v (%v), want ids %v", len(ids), ids, tc.wantIDs)
			}
			for i := range tc.wantIDs {
				if ids[i] != tc.wantIDs[i] {
					t.Fatalf("got order %v, want %v", ids, tc.wantIDs)
				}
			}
		})
	}
}

func TestEvaluate_InvalidJSONTypesRejectedAtDecode_NotEvaluator(t *testing.T) {
	// Dokumentation: Regelauswertung arbeitet auf typisiertem EvalInput; kaputte JSON-Zahlen
	// scheitern beim HTTP-Decode (siehe API-Tests). Hier nur sicherstellen: nil-Zeiger crashen nicht.
	rs, err := Parse([]byte(`version: 1
rules:
  - id: only_ph
    name: P
    diagnosis_type: p
    severity: low
    confidence: 1
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: ph, eq: 7 }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`))
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("panic: %v", r)
		}
	}()
	if ms := rs.Evaluate(EvalInput{}); len(ms) != 0 {
		t.Fatalf("want no match, got %v", ms)
	}
}

func TestParse_RejectsLeafWithoutComparator(t *testing.T) {
	y := `version: 1
rules:
  - id: leaf_bad
    name: X
    diagnosis_type: x
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when: { field: ph }
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	_, err := Parse([]byte(y))
	if err == nil || !strings.Contains(err.Error(), "comparator") {
		t.Fatalf("want comparator error, got %v", err)
	}
}
