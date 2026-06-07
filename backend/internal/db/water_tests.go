package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"aquadiag/backend/internal/models"
)

// ErrWaterTestNotFound signals that no water_tests row exists for the given id.
var ErrWaterTestNotFound = errors.New("water test not found")

// InsertWaterTest persists a water test row; symptoms are stored as JSON array.
func InsertWaterTest(ctx context.Context, q DBTX, tankID int64, w models.WaterTestInput, symptoms []string) (int64, error) {
	return InsertWaterTestWithSnapshots(ctx, q, tankID, w, symptoms, "", "", "", "")
}

// InsertWaterTestWithSnapshots persists a water test row and optional immutable config snapshots.
func InsertWaterTestWithSnapshots(ctx context.Context, q DBTX, tankID int64, w models.WaterTestInput, symptoms []string, configSnapshotJSON string, thresholdResultsSnapshotJSON string, configVersionName string, configVersionCreatedAt string) (int64, error) {
	symJSON, err := json.Marshal(symptoms)
	if err != nil {
		return 0, err
	}
	res, err := q.ExecContext(ctx, `
INSERT INTO water_tests (
  tank_id, ph, kh_dkh, gh_dgh, temp_c, nitrite_mg_l, nitrate_mg_l, ammonium_mg_l,
  phosphate_po4, iron_fe, oxygen_mg_l, oxygen_saturation_pct, co2_mg_l, symptoms_json, notes,
  config_snapshot_json, threshold_results_snapshot_json, config_version_name, config_version_created_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		tankID,
		nullFloat(w.PH),
		nullFloat(w.KhDKH),
		nullFloat(w.GhDGH),
		nullFloat(w.TempC),
		nullFloat(w.NitriteMgL),
		nullFloat(w.NitrateMgL),
		nullFloat(w.AmmoniumMgL),
		nullFloat(w.PhosphatePO4),
		nullFloat(w.IronFe),
		nullFloat(w.OxygenMgL),
		nullFloat(w.OxygenSaturationPct),
		nullFloat(w.CO2MgL),
		string(symJSON),
		nullStr(w.Notes),
		nullStr(&configSnapshotJSON),
		nullStr(&thresholdResultsSnapshotJSON),
		nullStr(&configVersionName),
		nullStr(&configVersionCreatedAt),
	)
	if err != nil {
		return 0, err
	}
	return res.LastInsertId()
}

const waterTestSelectCols = `
id, tank_id, ph, kh_dkh, gh_dgh, temp_c, nitrite_mg_l, nitrate_mg_l, ammonium_mg_l,
phosphate_po4, iron_fe, oxygen_mg_l, oxygen_saturation_pct, co2_mg_l, symptoms_json, notes, created_at,
config_snapshot_json, threshold_results_snapshot_json, config_version_name, config_version_created_at,
(SELECT dr.id FROM diagnosis_results dr WHERE dr.water_test_id = water_tests.id ORDER BY dr.id DESC LIMIT 1) AS diagnosis_result_id`

// ListWaterTestsByTank returns water tests for a tank, newest id first.
func ListWaterTestsByTank(ctx context.Context, q DBTX, tankID int64) ([]models.WaterTestRecord, error) {
	rows, err := q.QueryContext(ctx, `
SELECT `+waterTestSelectCols+`
FROM water_tests WHERE tank_id = ? ORDER BY id DESC`, tankID)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	var out []models.WaterTestRecord
	for rows.Next() {
		rec, err := scanWaterTestRow(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

// WaterTestByID loads one water test by primary key.
func WaterTestByID(ctx context.Context, q DBTX, id int64) (models.WaterTestRecord, error) {
	row := q.QueryRowContext(ctx, `
SELECT `+waterTestSelectCols+`
FROM water_tests WHERE id = ?`, id)
	rec, err := scanWaterTestRow(row.Scan)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.WaterTestRecord{}, fmt.Errorf("%w: id=%d", ErrWaterTestNotFound, id)
		}
		return models.WaterTestRecord{}, err
	}
	return rec, nil
}

// DeleteWaterTestCascade deletes diagnosis_results rows for the test, then the water_tests row.
func DeleteWaterTestCascade(ctx context.Context, tx *sql.Tx, waterTestID int64) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM diagnosis_results WHERE water_test_id = ?`, waterTestID); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `DELETE FROM water_tests WHERE id = ?`, waterTestID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("%w: id=%d", ErrWaterTestNotFound, waterTestID)
	}
	return nil
}

func scanWaterTestRow(scan func(dest ...any) error) (models.WaterTestRecord, error) {
	var rec models.WaterTestRecord
	var ph, kh, gh, temp, no2, no3, nh4, po4, fe, o2, o2sat, co2 sql.NullFloat64
	var notes, configSnapshot, thresholdSnapshot, configVersionName, configVersionCreatedAt sql.NullString
	var diagnosisID sql.NullInt64
	var symJSON string
	err := scan(
		&rec.ID,
		&rec.TankID,
		&ph,
		&kh,
		&gh,
		&temp,
		&no2,
		&no3,
		&nh4,
		&po4,
		&fe,
		&o2,
		&o2sat,
		&co2,
		&symJSON,
		&notes,
		&rec.CreatedAt,
		&configSnapshot,
		&thresholdSnapshot,
		&configVersionName,
		&configVersionCreatedAt,
		&diagnosisID,
	)
	if err != nil {
		return models.WaterTestRecord{}, err
	}
	rec.PH = ptrFloat64(ph)
	rec.KhDKH = ptrFloat64(kh)
	rec.GhDGH = ptrFloat64(gh)
	rec.TempC = ptrFloat64(temp)
	rec.NitriteMgL = ptrFloat64(no2)
	rec.NitrateMgL = ptrFloat64(no3)
	rec.AmmoniumMgL = ptrFloat64(nh4)
	rec.PhosphatePO4 = ptrFloat64(po4)
	rec.IronFe = ptrFloat64(fe)
	rec.OxygenMgL = ptrFloat64(o2)
	rec.OxygenSaturationPct = ptrFloat64(o2sat)
	rec.CO2MgL = ptrFloat64(co2)
	if symJSON != "" {
		if err := json.Unmarshal([]byte(symJSON), &rec.Symptoms); err != nil {
			return models.WaterTestRecord{}, fmt.Errorf("symptoms_json: %w", err)
		}
	}
	if notes.Valid {
		s := notes.String
		rec.Notes = &s
	}
	if diagnosisID.Valid {
		id := diagnosisID.Int64
		rec.DiagnosisResultID = &id
	}
	rec.ConfigSnapshotJSON = ptrString(configSnapshot)
	rec.ThresholdResultsSnapshotJSON = ptrString(thresholdSnapshot)
	rec.ConfigVersionName = ptrString(configVersionName)
	rec.ConfigVersionCreatedAt = ptrString(configVersionCreatedAt)
	rec.CreatedAt = normalizeSQLiteTimestamp(rec.CreatedAt)
	return rec, nil
}

func ptrFloat64(ns sql.NullFloat64) *float64 {
	if !ns.Valid {
		return nil
	}
	v := ns.Float64
	return &v
}

func ptrString(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	v := ns.String
	return &v
}

func nullFloat(p *float64) any {
	if p == nil {
		return nil
	}
	return *p
}

func nullStr(p *string) any {
	if p == nil {
		return nil
	}
	s := *p
	if s == "" {
		return nil
	}
	return s
}

// InsertDiagnosisResult stores the diagnosis output linked to a water test.
func InsertDiagnosisResult(ctx context.Context, q DBTX, row models.DiagnosisResultRow) (int64, error) {
	followUps := row.FollowUpAnswersJSON
	if followUps == "" {
		followUps = "{}"
	}
	res, err := q.ExecContext(ctx, `
INSERT INTO diagnosis_results (
  water_test_id, diagnosis_type, confidence, severity,
  actions_now_json, actions_optional_json, avoid_json, facts_json,
  matched_rule_ids_json, runner_up_json, explanation_json, follow_up_answers_json
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
		row.WaterTestID,
		row.DiagnosisType,
		row.Confidence,
		row.Severity,
		row.ActionsNowJSON,
		row.ActionsOptionalJSON,
		row.AvoidJSON,
		row.FactsJSON,
		row.MatchedRuleIDsJSON,
		row.RunnerUpJSON,
		row.ExplanationJSON,
		followUps,
	)
	if err != nil {
		return 0, fmt.Errorf("insert diagnosis: %w", err)
	}
	return res.LastInsertId()
}
