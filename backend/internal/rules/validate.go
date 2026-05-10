package rules

import (
	"fmt"
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
	return hasNumericComparator(w) || hasStringComparator(w) || hasBoolComparator(w)
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

func validateLeaf(ruleID, path string, w When) error {
	field := strings.TrimSpace(strings.ToLower(w.Field))
	if field == "" {
		return fmt.Errorf("%q %s: leaf requires field", ruleID, path)
	}

	boolCmp := hasBoolComparator(w)
	num := hasNumericComparator(w)
	str := hasStringComparator(w)

	modes := 0
	if boolCmp {
		modes++
	}
	if num {
		modes++
	}
	if str {
		modes++
	}
	if modes == 0 {
		return fmt.Errorf("%q %s: leaf requires at least one comparator (numeric, string contains*, or is_true)", ruleID, path)
	}
	if modes > 1 {
		return fmt.Errorf("%q %s: cannot mix comparator kinds on the same leaf", ruleID, path)
	}

	switch field {
	case "symptoms":
		if boolCmp || num {
			return fmt.Errorf("%q %s: field %q supports only string symptom matchers", ruleID, path, field)
		}
		if !str {
			return fmt.Errorf("%q %s: field %q requires contains / contains_any / contains_all", ruleID, path, field)
		}
		return nil
	}

	if isBoolRuleField(field) {
		if !boolCmp {
			return fmt.Errorf("%q %s: field %q requires is_true", ruleID, path, field)
		}
		return nil
	}

	if boolCmp {
		return fmt.Errorf("%q %s: is_true is only allowed on boolean diagnosis-context fields", ruleID, path)
	}

	if !isNumericRuleField(field) {
		return fmt.Errorf("%q %s: unknown field %q", ruleID, path, strings.TrimSpace(w.Field))
	}
	if str {
		return fmt.Errorf("%q %s: field %q cannot use string operators (contains / contains_any / contains_all)", ruleID, path, field)
	}
	return nil
}
