package rules

import (
	"fmt"
	"strings"
)

// Severity is the canonical severity classification used by the rule engine
// and propagated unchanged into API responses and the frontend.
//
// The set is intentionally small, ordered, and stable. Adding a new value
// requires updating the frontend mapping (SeverityBadge / lib/severity.ts)
// and the README severity table in the same change.
type Severity string

const (
	SeverityInfo     Severity = "info"
	SeverityLow      Severity = "low"
	SeverityMedium   Severity = "medium"
	SeverityHigh     Severity = "high"
	SeverityCritical Severity = "critical"
)

// AllowedSeverities is the canonical, ordered list of supported severities.
// Order is "ascending impact" and is the order shown in user-facing docs.
var AllowedSeverities = []Severity{
	SeverityInfo,
	SeverityLow,
	SeverityMedium,
	SeverityHigh,
	SeverityCritical,
}

// IsValidSeverity reports whether s is one of AllowedSeverities (case-sensitive).
//
// Severity values are author-controlled (YAML), so we deliberately do not
// lower-case here: a typo like "High" must fail loudly at load time rather
// than be silently normalized.
func IsValidSeverity(s string) bool {
	for _, v := range AllowedSeverities {
		if string(v) == s {
			return true
		}
	}
	return false
}

// allowedSeveritiesList renders the allowed values for error messages.
func allowedSeveritiesList() string {
	parts := make([]string, 0, len(AllowedSeverities))
	for _, v := range AllowedSeverities {
		parts = append(parts, string(v))
	}
	return strings.Join(parts, ", ")
}

// validateSeverities checks every rule's severity field. Empty or unknown
// values produce a deterministic, descriptive error so that startup fails
// fast instead of leaking unmapped severities into API responses.
func validateSeverities(rs Ruleset) error {
	for i, r := range rs.Rules {
		if r.ID == "" {
			continue
		}
		sev := strings.TrimSpace(r.Severity)
		if sev == "" {
			return fmt.Errorf("rules[%d] %q: severity must be set (allowed: %s)", i, r.ID, allowedSeveritiesList())
		}
		if !IsValidSeverity(sev) {
			return fmt.Errorf("rules[%d] %q: invalid severity %q (allowed: %s)", i, r.ID, sev, allowedSeveritiesList())
		}
	}
	return nil
}
