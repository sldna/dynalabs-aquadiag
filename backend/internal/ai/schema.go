package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"aquadiag/backend/internal/models"
)

// ParseAndValidateExplanation enforces the required JSON-only schema.
func ParseAndValidateExplanation(raw string) (*models.AIExplanation, error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return nil, fmt.Errorf("empty ai content")
	}

	dec := json.NewDecoder(bytes.NewReader([]byte(s)))
	dec.DisallowUnknownFields()

	var ex models.AIExplanation
	if err := dec.Decode(&ex); err != nil {
		return nil, fmt.Errorf("invalid ai json: %w", err)
	}
	// Ensure there's no trailing junk.
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("invalid ai json: trailing content")
	}

	trimSlice := func(in []string) []string {
		out := make([]string, 0, len(in))
		for _, v := range in {
			v = strings.TrimSpace(v)
			if v != "" {
				out = append(out, v)
			}
		}
		return out
	}

	ex.Summary = strings.TrimSpace(ex.Summary)
	ex.ReasoningPublic = strings.TrimSpace(ex.ReasoningPublic)
	ex.SafetyNote = strings.TrimSpace(ex.SafetyNote)
	ex.ActionsNow = trimSlice(ex.ActionsNow)
	ex.ActionsOptional = trimSlice(ex.ActionsOptional)
	ex.Avoid = trimSlice(ex.Avoid)
	ex.FollowUpQuestions = trimSlice(ex.FollowUpQuestions)

	// Required fields (non-empty strings). Lists may be empty.
	if ex.Summary == "" {
		return nil, fmt.Errorf("schema: summary required")
	}
	if ex.ReasoningPublic == "" {
		return nil, fmt.Errorf("schema: reasoning_public required")
	}
	if ex.SafetyNote == "" {
		return nil, fmt.Errorf("schema: safety_note required")
	}

	return &ex, nil
}
