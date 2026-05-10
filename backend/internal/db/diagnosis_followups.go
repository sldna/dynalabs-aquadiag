package db

import (
	"context"
	"errors"
	"fmt"
)

// ErrDiagnosisNotFound is returned when no diagnosis_results row matches the id.
var ErrDiagnosisNotFound = errors.New("diagnosis not found")

// UpdateDiagnosisFollowUpAnswers stores JSON text for follow_up_answers_json (caller-validated JSON object).
func UpdateDiagnosisFollowUpAnswers(ctx context.Context, q DBTX, diagnosisID int64, followUpAnswersJSON string) error {
	res, err := q.ExecContext(ctx, `
UPDATE diagnosis_results SET follow_up_answers_json = ? WHERE id = ?`,
		followUpAnswersJSON, diagnosisID)
	if err != nil {
		return fmt.Errorf("update diagnosis follow-ups: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return ErrDiagnosisNotFound
	}
	return nil
}
