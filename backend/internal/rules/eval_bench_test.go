package rules

import (
	"path/filepath"
	"testing"
)

func BenchmarkEvaluate_ProductionRuleset_WorstCaseManyMatches(b *testing.B) {
	path := filepath.Clean(filepath.Join("..", "..", "..", "rules", "aquarium-rules.yaml"))
	rs, err := LoadFile(path)
	if err != nil {
		b.Fatal(err)
	}
	co2 := 35.0
	n := 50.0
	ph := 6.5
	kh := 4.0
	in := EvalInput{
		CO2MgL:     &co2,
		NitrateMgL: &n,
		PH:         &ph,
		KhDKH:      &kh,
		Symptoms: []string{
			"milky_water",
			"green_water",
			"fish_gasping_surface",
			"co2_related_ph_swings",
		},
	}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = rs.Evaluate(in)
	}
}

func BenchmarkEvaluate_MinimalRuleset_SingleMatch(b *testing.B) {
	y := `version: 1
rules:
  - id: r1
    name: A
    diagnosis_type: a
    severity: low
    confidence: 0.5
    summary_de: ""
    reasoning_de: ""
    follow_up_questions_de: []
    safety_note_de: ""
    when:
      any:
        - field: nitrite_mg_l
          gte: 0.25
        - all:
            - field: symptoms
              contains_any: [x, y]
    actions_now: []
    actions_optional: []
    avoid: []
    facts: []
`
	rs, err := Parse([]byte(y))
	if err != nil {
		b.Fatal(err)
	}
	v := 0.3
	in := EvalInput{NitriteMgL: &v}
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = rs.Evaluate(in)
	}
}
