package ai

import (
	"os"
	"strings"

	"aquadiag/backend/internal/models"
)

// Config steuert die optionale KI-Schicht (V1: Erklärung kommt primär aus Regeln).
type Config struct {
	Enabled bool
}

// ConfigFromEnv liest AI_ENABLED ("1", "true", "yes", "on").
func ConfigFromEnv() Config {
	return Config{Enabled: parseBool(os.Getenv("AI_ENABLED"))}
}

func parseBool(raw string) bool {
	s := strings.ToLower(strings.TrimSpace(raw))
	return s == "1" || s == "true" || s == "yes" || s == "on"
}

// BuildExplanation erzeugt die strukturierte Erklärung aus Regeltext.
// Ohne KI-Anbindung bleibt der Inhalt deterministisch; die Regelengine bleibt maßgeblich.
func BuildExplanation(cfg Config, m models.RuleMatch) models.Explanation {
	_ = cfg // reserviert für spätere KI-Nachbearbeitung ohne Diagnoseänderung
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
