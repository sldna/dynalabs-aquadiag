package ai

import (
	"aquadiag/backend/internal/models"
)

// BuildDeterministicExplanation erzeugt die strukturierte Erklärung aus Regeltext.
// Ohne KI-Anbindung bleibt der Inhalt deterministisch; die Regelengine bleibt maßgeblich.
func BuildDeterministicExplanation(m models.RuleMatch) models.Explanation {
	return models.Explanation{
		Summary:           m.SummaryDE,
		ReasoningPublic:   m.ReasoningDE,
		ActionsNow:        append([]string(nil), m.ActionsNow...),
		ActionsOptional:   append([]string(nil), m.ActionsOptional...),
		Avoid:             append([]string(nil), m.Avoid...),
		FollowUpQuestions: append([]string(nil), m.FollowUpDE...),
		SafetyNote:        m.SafetyNoteDE,
		Source:            "deterministic",
	}
}
