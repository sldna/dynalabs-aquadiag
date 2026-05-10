package rules

import (
	"fmt"
	"math"
	"strings"
)

func validateRuleset(rs Ruleset) error {
	seen := make(map[string]struct{}, len(rs.Rules))
	for i, r := range rs.Rules {
		id := strings.TrimSpace(r.ID)
		if id == "" {
			continue
		}
		if _, dup := seen[id]; dup {
			return fmt.Errorf("duplicate rule id %q", id)
		}
		seen[id] = struct{}{}

		if strings.TrimSpace(r.DiagnosisType) == "" {
			return fmt.Errorf("rules[%d] %q: diagnosis_type must not be empty", i, id)
		}

		if err := validateWhen(id, "when", r.When); err != nil {
			return fmt.Errorf("rules[%d] %w", i, err)
		}
		if r.ExcludeIf != nil {
			if err := validateWhen(id, "exclude_if", *r.ExcludeIf); err != nil {
				return fmt.Errorf("rules[%d] %w", i, err)
			}
		}
		if err := validateWaterBoosts(id, r.WaterBoosts); err != nil {
			return fmt.Errorf("rules[%d] %w", i, err)
		}
		if err := validateConfidenceBase(id, r.ConfidenceBase); err != nil {
			return fmt.Errorf("rules[%d] %w", i, err)
		}
	}

	if err := validateSeverities(rs); err != nil {
		return err
	}
	return nil
}

func hasInlineLeafSignals(w When) bool {
	if strings.TrimSpace(w.Field) != "" {
		return true
	}
	return hasNumericComparator(w) || hasStringComparator(w)
}

func validateWhen(ruleID, path string, w When) error {
	notSet := w.Not != nil
	allSet := len(w.All) > 0
	anySet := len(w.Any) > 0
	leafSet := hasInlineLeafSignals(w)

	modes := 0
	if notSet {
		modes++
	}
	if allSet {
		modes++
	}
	if anySet {
		modes++
	}
	if leafSet {
		modes++
	}

	if modes == 0 {
		return fmt.Errorf("%q %s: when clause is empty", ruleID, path)
	}
	if modes > 1 {
		return fmt.Errorf("%q %s: use exactly one of not, all, any, or a leaf field comparator", ruleID, path)
	}

	if notSet {
		return validateWhen(ruleID, path+".not", *w.Not)
	}
	if allSet {
		for i := range w.All {
			p := fmt.Sprintf("%s.all[%d]", path, i)
			if err := validateWhen(ruleID, p, w.All[i]); err != nil {
				return err
			}
		}
		return nil
	}
	if anySet {
		for i := range w.Any {
			p := fmt.Sprintf("%s.any[%d]", path, i)
			if err := validateWhen(ruleID, p, w.Any[i]); err != nil {
				return err
			}
		}
		return nil
	}
	return validateLeaf(ruleID, path, w)
}

func validateConfidenceBase(ruleID string, v *float64) error {
	if v == nil {
		return nil
	}
	x := *v
	if math.IsNaN(x) || math.IsInf(x, 0) {
		return fmt.Errorf("%q confidence_base must be a finite number", ruleID)
	}
	if x < 0 || x > 1 {
		return fmt.Errorf("%q confidence_base must be between 0 and 1", ruleID)
	}
	return nil
}

func validateWaterBoosts(ruleID string, boosts []WaterBoost) error {
	for i, b := range boosts {
		path := fmt.Sprintf("water_boosts[%d].when", i)
		if err := validateWhen(ruleID, path, b.When); err != nil {
			return err
		}
		if b.Add <= 0 {
			return fmt.Errorf("%q water_boosts[%d]: add must be > 0", ruleID, i)
		}
		if math.IsNaN(b.Add) || math.IsInf(b.Add, 0) {
			return fmt.Errorf("%q water_boosts[%d]: add must be finite", ruleID, i)
		}
	}
	return nil
}

func validateLeaf(ruleID, path string, w When) error {
	field := strings.TrimSpace(strings.ToLower(w.Field))
	if field == "" {
		return fmt.Errorf("%q %s: leaf requires field", ruleID, path)
	}

	num := hasNumericComparator(w)
	str := hasStringComparator(w)

	if !num && !str {
		return fmt.Errorf("%q %s: leaf requires at least one comparator (eq, neq, gt, gte, lt, lte, contains, contains_any, contains_all)", ruleID, path)
	}
	if num && str {
		return fmt.Errorf("%q %s: cannot mix numeric and string comparators on the same leaf", ruleID, path)
	}

	switch field {
	case "symptoms":
		if num {
			return fmt.Errorf("%q %s: field %q cannot use numeric operators", ruleID, path, field)
		}
	default:
		if !isNumericRuleField(field) {
			return fmt.Errorf("%q %s: unknown field %q", ruleID, path, strings.TrimSpace(w.Field))
		}
		if str {
			return fmt.Errorf("%q %s: field %q cannot use string operators (contains / contains_any / contains_all)", ruleID, path, field)
		}
	}
	return nil
}
