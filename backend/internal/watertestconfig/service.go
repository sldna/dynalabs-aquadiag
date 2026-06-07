package watertestconfig

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Service struct {
	repo *Repository
	now  func() time.Time
}

func NewService(database *sql.DB) *Service {
	return &Service{repo: NewRepository(database), now: time.Now}
}

func (s *Service) GetActiveConfig(ctx context.Context) (ConfigVersionDetail, error) {
	id, err := s.repo.activeVersionID(ctx)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	return s.GetConfigVersion(ctx, id)
}

func (s *Service) GetConfigVersion(ctx context.Context, id int64) (ConfigVersionDetail, error) {
	return s.repo.getDetail(ctx, id)
}

func (s *Service) ListConfigVersions(ctx context.Context) ([]ConfigVersion, error) {
	return s.repo.listVersions(ctx)
}

func (s *Service) CreateDraftFromActive(ctx context.Context) (ConfigVersionDetail, error) {
	id, err := s.repo.activeVersionID(ctx)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	return s.CreateDraftFromVersion(ctx, id)
}

func (s *Service) CreateDraftFromVersion(ctx context.Context, sourceVersionID int64) (ConfigVersionDetail, error) {
	source, err := s.repo.getDetail(ctx, sourceVersionID)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	tx, err := s.repo.db.BeginTx(ctx, nil)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	defer func() { _ = tx.Rollback() }()

	name := strings.TrimSpace(source.Name) + " Entwurf"
	res, err := tx.ExecContext(ctx, `
INSERT INTO water_test_config_versions (name, description, is_active, is_draft, created_by)
VALUES (?, ?, 0, 1, ?)`, name, source.Description, source.CreatedBy)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	newID, err := res.LastInsertId()
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := s.replaceVersionRows(ctx, tx, newID, source.Tests); err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := tx.Commit(); err != nil {
		return ConfigVersionDetail{}, err
	}
	return s.GetConfigVersion(ctx, newID)
}

func (s *Service) UpdateDraftConfig(ctx context.Context, versionID int64, payload ConfigUpdatePayload) (ConfigVersionDetail, error) {
	version, err := s.repo.getVersion(ctx, versionID)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	if !version.IsDraft || version.IsActive {
		return ConfigVersionDetail{}, fmt.Errorf("readonly config version")
	}
	detail := ConfigVersionDetail{ConfigVersion: version, Tests: payload.Tests}
	if res := ValidateDetail(detail); !res.Valid {
		return ConfigVersionDetail{}, validationError{result: res}
	}

	tx, err := s.repo.db.BeginTx(ctx, nil)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	defer func() { _ = tx.Rollback() }()

	if payload.Name != nil {
		name := strings.TrimSpace(*payload.Name)
		if name == "" {
			return ConfigVersionDetail{}, validationError{result: ValidationResult{Errors: []ValidationIssue{{Field: "name", Code: "required", Message: "name darf nicht leer sein."}}}}
		}
		if _, err := tx.ExecContext(ctx, `UPDATE water_test_config_versions SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, name, versionID); err != nil {
			return ConfigVersionDetail{}, err
		}
	}
	if payload.Description != nil {
		if _, err := tx.ExecContext(ctx, `UPDATE water_test_config_versions SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, *payload.Description, versionID); err != nil {
			return ConfigVersionDetail{}, err
		}
	}
	if err := s.replaceVersionRows(ctx, tx, versionID, payload.Tests); err != nil {
		return ConfigVersionDetail{}, err
	}
	if _, err := tx.ExecContext(ctx, `UPDATE water_test_config_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, versionID); err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := tx.Commit(); err != nil {
		return ConfigVersionDetail{}, err
	}
	return s.GetConfigVersion(ctx, versionID)
}

func (s *Service) ValidateConfigVersion(ctx context.Context, versionID int64) (ValidationResult, error) {
	detail, err := s.GetConfigVersion(ctx, versionID)
	if err != nil {
		return ValidationResult{}, err
	}
	res := ValidateDetail(detail)
	if res.Valid {
		activeCount, err := s.activeCount(ctx)
		if err != nil {
			return ValidationResult{}, err
		}
		if activeCount != 1 {
			res.Errors = appendIssue(res.Errors, "versions", "active_count", "Es muss genau eine aktive Config-Version geben.")
			res.Valid = false
		}
	}
	return res, nil
}

func (s *Service) ActivateConfigVersion(ctx context.Context, versionID int64) (ConfigVersionDetail, error) {
	res, err := s.ValidateConfigVersion(ctx, versionID)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	if !res.Valid {
		return ConfigVersionDetail{}, validationError{result: res}
	}
	tx, err := s.repo.db.BeginTx(ctx, nil)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, `UPDATE water_test_config_versions SET is_active = 0, updated_at = CURRENT_TIMESTAMP`); err != nil {
		return ConfigVersionDetail{}, err
	}
	if _, err := tx.ExecContext(ctx, `
UPDATE water_test_config_versions
SET is_active = 1, is_draft = 0, activated_at = ?, updated_at = CURRENT_TIMESTAMP
WHERE id = ?`, s.now().UTC().Format(time.RFC3339), versionID); err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := tx.Commit(); err != nil {
		return ConfigVersionDetail{}, err
	}
	return s.GetConfigVersion(ctx, versionID)
}

func (s *Service) replaceVersionRows(ctx context.Context, tx *sql.Tx, versionID int64, tests []TestConfig) error {
	for _, table := range []string{"water_test_value_options", "water_test_thresholds", "water_test_timers"} {
		if _, err := tx.ExecContext(ctx, `DELETE FROM `+table+` WHERE config_version_id = ?`, versionID); err != nil {
			return err
		}
	}
	for _, test := range tests {
		id, err := s.upsertDefinition(ctx, tx, test)
		if err != nil {
			return err
		}
		for _, opt := range test.Values {
			display := opt.DisplayValue
			if display == "" {
				display = opt.Label
			}
			if _, err := tx.ExecContext(ctx, `
INSERT INTO water_test_value_options (config_version_id, test_definition_id, value, display_value, sort_order)
VALUES (?, ?, ?, ?, ?)`, versionID, id, opt.Value, display, opt.SortOrder); err != nil {
				return err
			}
		}
		for _, th := range test.Thresholds {
			if _, err := tx.ExecContext(ctx, `
INSERT INTO water_test_thresholds (config_version_id, test_definition_id, min_value, max_value, status, message, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?)`, versionID, id, thresholdMin(th), thresholdMax(th), th.Status, th.Message, th.SortOrder); err != nil {
				return err
			}
		}
		for _, timer := range test.Timers {
			label := strings.TrimSpace(timer.StepLabel)
			if label == "" {
				label = timer.Label
			}
			if _, err := tx.ExecContext(ctx, `
INSERT INTO water_test_timers (config_version_id, test_definition_id, step_label, duration_seconds, step_order)
VALUES (?, ?, ?, ?, ?)`, versionID, id, label, timer.DurationSeconds, timer.StepOrder); err != nil {
				return err
			}
		}
	}
	return nil
}

func (s *Service) upsertDefinition(ctx context.Context, tx *sql.Tx, test TestConfig) (int64, error) {
	if test.Brand == "" {
		test.Brand = "JBL"
	}
	if test.InputType == "" {
		test.InputType = "select"
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO water_test_definitions (test_key, label, brand, unit, input_type, sort_order, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(test_key) DO UPDATE SET
  label = excluded.label,
  brand = excluded.brand,
  unit = excluded.unit,
  input_type = excluded.input_type,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = CURRENT_TIMESTAMP`, strings.TrimSpace(test.Key), strings.TrimSpace(test.Label), test.Brand, test.Unit, test.InputType, test.SortOrder, test.IsActive)
	if err != nil {
		return 0, err
	}
	var id int64
	err = tx.QueryRowContext(ctx, `SELECT id FROM water_test_definitions WHERE test_key = ?`, strings.TrimSpace(test.Key)).Scan(&id)
	return id, err
}

func (s *Service) activeCount(ctx context.Context) (int, error) {
	var n int
	err := s.repo.db.QueryRowContext(ctx, `SELECT COUNT(1) FROM water_test_config_versions WHERE is_active = 1`).Scan(&n)
	return n, err
}

type validationError struct {
	result ValidationResult
}

func (e validationError) Error() string {
	return "water test config validation failed"
}

func IsValidationError(err error) (ValidationResult, bool) {
	var ve validationError
	if errors.As(err, &ve) {
		return ve.result, true
	}
	return ValidationResult{}, false
}
