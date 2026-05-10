package ai

import (
	"encoding/json"
	"fmt"
	"strings"

	"aquadiag/backend/internal/models"
)

const systemPromptDE = `Du bist ein Explainability-Layer für ein deterministisches Aquarium-Diagnose-System.
Wichtig:
- Du entscheidest keine Diagnose.
- Du veränderst keine Diagnose-Felder, keine Severity, keine Confidence.
- Du erfindest keine riskanten Maßnahmen.
- Du gibst keine medizinischen/veterinärmedizinischen Garantien.
- Du antwortest NUR als JSON (kein Markdown, kein zusätzlicher Text).`

type promptInput struct {
	RuleID          string   `json:"rule_id"`
	Name            string   `json:"name"`
	DiagnosisType   string   `json:"diagnosis_type"`
	Severity        string   `json:"severity"`
	Confidence      float64  `json:"confidence"`
	SummaryDE       string   `json:"summary_de"`
	ReasoningDE     string   `json:"reasoning_de"`
	ActionsNow      []string `json:"actions_now"`
	ActionsOptional []string `json:"actions_optional"`
	Avoid           []string `json:"avoid"`
	Facts           []string `json:"facts"`
	FollowUpDE      []string `json:"follow_up_questions_de"`
	SafetyNoteDE    string   `json:"safety_note_de"`
}

type promptContext struct {
	AquariumContext *models.DiagnosisContext `json:"aquarium_context,omitempty"`
	TopDiagnosis    promptInput              `json:"top_diagnosis"`
	Diagnoses       []promptInput            `json:"diagnoses"`
	MatchedRules    []string                 `json:"matched_rules"`
}

func toPromptInput(m models.RuleMatch) promptInput {
	return promptInput{
		RuleID:          m.RuleID,
		Name:            strings.TrimSpace(m.Name),
		DiagnosisType:   m.DiagnosisType,
		Severity:        m.Severity,
		Confidence:      m.Confidence,
		SummaryDE:       m.SummaryDE,
		ReasoningDE:     m.ReasoningDE,
		ActionsNow:      append([]string(nil), m.ActionsNow...),
		ActionsOptional: append([]string(nil), m.ActionsOptional...),
		Avoid:           append([]string(nil), m.Avoid...),
		Facts:           append([]string(nil), m.Facts...),
		FollowUpDE:      append([]string(nil), m.FollowUpDE...),
		SafetyNoteDE:    m.SafetyNoteDE,
	}
}

func BuildUserPrompt(top models.RuleMatch, all []models.RuleMatch, matchedRules []string, dxCtx *models.DiagnosisContext) (string, error) {
	ctx := promptContext{
		TopDiagnosis: toPromptInput(top),
		Diagnoses:    make([]promptInput, 0, len(all)),
		MatchedRules: append([]string(nil), matchedRules...),
	}
	if dxCtx != nil && dxCtx.HasAny() {
		ctx.AquariumContext = dxCtx
	}
	for _, m := range all {
		ctx.Diagnoses = append(ctx.Diagnoses, toPromptInput(m))
	}

	b, err := json.MarshalIndent(ctx, "", "  ")
	if err != nil {
		return "", err
	}

	return fmt.Sprintf(`Erzeuge eine ruhige, präzise Erklärung in Deutsch basierend ausschließlich auf dem deterministischen Diagnose-Kontext unten.

Wenn aquarium_context gesetzt ist, nutze diese strukturierten Becken-Hinweise nur zur Erläuterung und Einordnung – ohne Severity/Confidence zu ändern und ohne neue diagnostische Labels zu erfinden.

Wenn diagnoses.length > 1, dann erwähne kurz die sekundären Diagnosen in summary oder reasoning_public, ohne sie über top_diagnosis zu stellen (top_diagnosis bleibt der Fokus).

Gib NUR ein JSON-Objekt mit exakt diesen Feldern zurück:
- summary (string)
- reasoning_public (string)
- actions_now (array of strings)
- actions_optional (array of strings)
- avoid (array of strings)
- follow_up_questions (array of strings)
- safety_note (string)

Deterministische Eingabe (nicht verändern, nur erklären):
%s`, string(b)), nil
}
