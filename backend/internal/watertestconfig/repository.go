package watertestconfig

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("water test config not found")

type Repository struct {
	db *sql.DB
}

func NewRepository(database *sql.DB) *Repository {
	return &Repository{db: database}
}

func (r *Repository) countVersions(ctx context.Context) (int, error) {
	var n int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM water_test_config_versions`).Scan(&n)
	return n, err
}

func (r *Repository) listVersions(ctx context.Context) ([]ConfigVersion, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, name, description, is_active, is_draft, created_at, updated_at, activated_at, created_by
FROM water_test_config_versions
ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()
	var out []ConfigVersion
	for rows.Next() {
		v, err := scanVersion(rows.Scan)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *Repository) activeVersionID(ctx context.Context) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `SELECT id FROM water_test_config_versions WHERE is_active = 1`).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrNotFound
	}
	return id, err
}

func (r *Repository) getVersion(ctx context.Context, id int64) (ConfigVersion, error) {
	row := r.db.QueryRowContext(ctx, `
SELECT id, name, description, is_active, is_draft, created_at, updated_at, activated_at, created_by
FROM water_test_config_versions WHERE id = ?`, id)
	v, err := scanVersion(row.Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return ConfigVersion{}, ErrNotFound
	}
	return v, err
}

func (r *Repository) getDetail(ctx context.Context, id int64) (ConfigVersionDetail, error) {
	version, err := r.getVersion(ctx, id)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	tests, byID, err := r.loadDefinitions(ctx, id)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := r.loadValues(ctx, id, byID); err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := r.loadThresholds(ctx, id, byID); err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := r.loadTimers(ctx, id, byID); err != nil {
		return ConfigVersionDetail{}, err
	}

	detail := ConfigVersionDetail{
		ConfigVersion: version,
		Tests:         tests,
		Thresholds:    map[string]ThresholdGroup{},
		Timers:        map[string]TimerGroup{},
	}
	for i := range detail.Tests {
		t := detail.Tests[i]
		if len(t.Thresholds) > 0 {
			detail.Thresholds[t.Key] = ThresholdGroup{Unit: t.Unit, Ranges: t.Thresholds}
		}
		if len(t.Timers) > 0 {
			detail.Timers[t.Key] = TimerGroup{
				TestKey:  t.Key,
				Label:    t.Label,
				FieldKey: fieldKeyForTimer(t.Key),
				Steps:    t.Timers,
			}
		}
	}
	return detail, nil
}

func (r *Repository) loadDefinitions(ctx context.Context, versionID int64) ([]TestConfig, map[int64]*TestConfig, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT DISTINCT d.id, d.test_key, d.label, d.brand, d.unit, d.input_type, d.sort_order, d.is_active
FROM water_test_definitions d
WHERE d.is_active = 1
   OR d.id IN (SELECT test_definition_id FROM water_test_value_options WHERE config_version_id = ?)
   OR d.id IN (SELECT test_definition_id FROM water_test_thresholds WHERE config_version_id = ?)
   OR d.id IN (SELECT test_definition_id FROM water_test_timers WHERE config_version_id = ?)
ORDER BY d.sort_order, d.id`, versionID, versionID, versionID)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = rows.Close() }()
	var tests []TestConfig
	for rows.Next() {
		var t TestConfig
		if err := rows.Scan(&t.ID, &t.Key, &t.Label, &t.Brand, &t.Unit, &t.InputType, &t.SortOrder, &t.IsActive); err != nil {
			return nil, nil, err
		}
		tests = append(tests, t)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	byID := map[int64]*TestConfig{}
	for i := range tests {
		byID[tests[i].ID] = &tests[i]
	}
	return tests, byID, nil
}

func (r *Repository) loadValues(ctx context.Context, versionID int64, byID map[int64]*TestConfig) error {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, test_definition_id, value, COALESCE(display_value, ''), sort_order
FROM water_test_value_options
WHERE config_version_id = ?
ORDER BY sort_order, id`, versionID)
	if err != nil {
		return err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var testID int64
		var v ValueOption
		if err := rows.Scan(&v.ID, &testID, &v.Value, &v.DisplayValue, &v.SortOrder); err != nil {
			return err
		}
		v.Label = v.DisplayValue
		if t := byID[testID]; t != nil {
			t.Values = append(t.Values, v)
		}
	}
	return rows.Err()
}

func (r *Repository) loadThresholds(ctx context.Context, versionID int64, byID map[int64]*TestConfig) error {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, test_definition_id, min_value, max_value, status, message, sort_order
FROM water_test_thresholds
WHERE config_version_id = ?
ORDER BY sort_order, id`, versionID)
	if err != nil {
		return err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var testID int64
		var min, max sql.NullFloat64
		var th Threshold
		if err := rows.Scan(&th.ID, &testID, &min, &max, &th.Status, &th.Message, &th.SortOrder); err != nil {
			return err
		}
		th.MinValue = ptrFloat(min)
		th.MaxValue = ptrFloat(max)
		th.Min = th.MinValue
		th.Max = th.MaxValue
		if t := byID[testID]; t != nil {
			t.Thresholds = append(t.Thresholds, th)
		}
	}
	return rows.Err()
}

func (r *Repository) loadTimers(ctx context.Context, versionID int64, byID map[int64]*TestConfig) error {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, test_definition_id, step_label, duration_seconds, step_order
FROM water_test_timers
WHERE config_version_id = ?
ORDER BY step_order, id`, versionID)
	if err != nil {
		return err
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var testID int64
		var step TimerStep
		if err := rows.Scan(&step.ID, &testID, &step.StepLabel, &step.DurationSeconds, &step.StepOrder); err != nil {
			return err
		}
		step.Label = step.StepLabel
		if t := byID[testID]; t != nil {
			step.StepID = fmt.Sprintf("%s_step%d", t.Key, step.StepOrder+1)
			if len(t.Timers) == 0 {
				step.StepID = t.Key
			}
			t.Timers = append(t.Timers, step)
		}
	}
	return rows.Err()
}

func scanVersion(scan func(dest ...any) error) (ConfigVersion, error) {
	var v ConfigVersion
	var desc, activated, createdBy sql.NullString
	if err := scan(&v.ID, &v.Name, &desc, &v.IsActive, &v.IsDraft, &v.CreatedAt, &v.UpdatedAt, &activated, &createdBy); err != nil {
		return ConfigVersion{}, err
	}
	v.Description = ptrString(desc)
	v.ActivatedAt = ptrString(activated)
	v.CreatedBy = ptrString(createdBy)
	return v, nil
}

func ptrString(s sql.NullString) *string {
	if !s.Valid {
		return nil
	}
	v := s.String
	return &v
}

func ptrFloat(f sql.NullFloat64) *float64 {
	if !f.Valid {
		return nil
	}
	v := f.Float64
	return &v
}

func fieldKeyForTimer(testKey string) string {
	switch testKey {
	case "no2":
		return "nitrite_no2"
	case "nh4":
		return "ammonium_nh4"
	case "fe":
		return "iron_fe"
	case "o2":
		return "oxygen_mg_l"
	default:
		return ""
	}
}
