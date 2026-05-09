package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"aquadiag/backend/internal/models"
)

// ErrTankNotFound signals that no tank row exists for the given id.
var ErrTankNotFound = errors.New("tank not found")

// InsertTank creates a tank row and returns id.
func InsertTank(ctx context.Context, q DBTX, name string, volumeLiters float64) (int64, error) {
	res, err := q.ExecContext(ctx, `
INSERT INTO tanks (name, volume_liters) VALUES (?, ?)`, name, volumeLiters)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	return id, nil
}

// TankByID loads a tank by id.
func TankByID(ctx context.Context, q DBTX, id int64) (models.Tank, error) {
	var t models.Tank
	var notes sql.NullString
	err := q.QueryRowContext(ctx, `
SELECT id, name, volume_liters, notes, created_at FROM tanks WHERE id = ?`, id).
		Scan(&t.ID, &t.Name, &t.VolumeLiters, &notes, &t.CreatedAt)
	if err == sql.ErrNoRows {
		return models.Tank{}, fmt.Errorf("%w: id=%d", ErrTankNotFound, id)
	}
	if err != nil {
		return models.Tank{}, err
	}
	t.CreatedAt = normalizeSQLiteTimestamp(t.CreatedAt)
	if notes.Valid {
		s := notes.String
		t.Notes = &s
	}
	return t, nil
}

// ListTanks returns all tanks, newest id first.
func ListTanks(ctx context.Context, q DBTX) ([]models.Tank, error) {
	rows, err := q.QueryContext(ctx, `
SELECT
  t.id,
  t.name,
  t.volume_liters,
  t.notes,
  t.created_at,
  (
    SELECT wt.created_at
    FROM water_tests wt
    WHERE wt.tank_id = t.id
    ORDER BY wt.id DESC
    LIMIT 1
  ) AS last_water_test_at,
  (
    SELECT dr.diagnosis_type
    FROM diagnosis_results dr
    JOIN water_tests wt ON wt.id = dr.water_test_id
    WHERE wt.tank_id = t.id
    ORDER BY dr.id DESC
    LIMIT 1
  ) AS latest_diagnosis_type,
  (
    SELECT dr.severity
    FROM diagnosis_results dr
    JOIN water_tests wt ON wt.id = dr.water_test_id
    WHERE wt.tank_id = t.id
    ORDER BY dr.id DESC
    LIMIT 1
  ) AS latest_diagnosis_severity,
  (
    SELECT dr.confidence
    FROM diagnosis_results dr
    JOIN water_tests wt ON wt.id = dr.water_test_id
    WHERE wt.tank_id = t.id
    ORDER BY dr.id DESC
    LIMIT 1
  ) AS latest_diagnosis_confidence
FROM tanks t
ORDER BY t.id DESC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []models.Tank
	for rows.Next() {
		var t models.Tank
		var notes, lastWaterTestAt, diagnosisType, diagnosisSeverity sql.NullString
		var diagnosisConfidence sql.NullFloat64
		if err := rows.Scan(
			&t.ID,
			&t.Name,
			&t.VolumeLiters,
			&notes,
			&t.CreatedAt,
			&lastWaterTestAt,
			&diagnosisType,
			&diagnosisSeverity,
			&diagnosisConfidence,
		); err != nil {
			return nil, err
		}
		if notes.Valid {
			s := notes.String
			t.Notes = &s
		}
		t.CreatedAt = normalizeSQLiteTimestamp(t.CreatedAt)
		if lastWaterTestAt.Valid {
			s := normalizeSQLiteTimestamp(lastWaterTestAt.String)
			t.LastWaterTestAt = &s
		}
		if diagnosisType.Valid {
			s := diagnosisType.String
			t.LatestDiagnosisType = &s
		}
		if diagnosisSeverity.Valid {
			s := diagnosisSeverity.String
			t.LatestDiagnosisSeverity = &s
		}
		if diagnosisConfidence.Valid {
			f := diagnosisConfidence.Float64
			t.LatestDiagnosisConfidence = &f
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// UpdateTank updates only the fields indicated by non-nil / notesSet.
func UpdateTank(ctx context.Context, q DBTX, id int64, name *string, volumeLiters *float64, notesSet bool, notes *string) error {
	var sets []string
	var args []any
	if name != nil {
		sets = append(sets, "name = ?")
		args = append(args, strings.TrimSpace(*name))
	}
	if volumeLiters != nil {
		sets = append(sets, "volume_liters = ?")
		args = append(args, *volumeLiters)
	}
	if notesSet {
		sets = append(sets, "notes = ?")
		args = append(args, sqlNotesArg(notes))
	}
	if len(sets) == 0 {
		return fmt.Errorf("no tank fields to update")
	}
	args = append(args, id)
	query := fmt.Sprintf("UPDATE tanks SET %s WHERE id = ?", strings.Join(sets, ", "))
	res, err := q.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("%w: id=%d", ErrTankNotFound, id)
	}
	return nil
}

func sqlNotesArg(notes *string) any {
	if notes == nil {
		return nil
	}
	s := strings.TrimSpace(*notes)
	if s == "" {
		return nil
	}
	return s
}

// DeleteTankCascade removes diagnosis_results and water_tests for the tank, then the tank row.
func DeleteTankCascade(ctx context.Context, tx *sql.Tx, tankID int64) error {
	if _, err := tx.ExecContext(ctx, `
DELETE FROM diagnosis_results WHERE water_test_id IN (SELECT id FROM water_tests WHERE tank_id = ?)`, tankID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM water_tests WHERE tank_id = ?`, tankID); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `DELETE FROM tanks WHERE id = ?`, tankID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("%w: id=%d", ErrTankNotFound, tankID)
	}
	return nil
}
