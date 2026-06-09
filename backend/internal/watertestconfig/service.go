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

	name := draftNameFrom(source.Name)
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
	if err := s.replaceVersionRows(ctx, tx, newID, source.Tests, source.TimerGroups); err != nil {
		return ConfigVersionDetail{}, err
	}
	if err := tx.Commit(); err != nil {
		return ConfigVersionDetail{}, err
	}
	return s.GetConfigVersion(ctx, newID)
}

func draftNameFrom(source string) string {
	name := strings.TrimSpace(source)
	for strings.HasSuffix(name, " Entwurf") {
		name = strings.TrimSpace(strings.TrimSuffix(name, " Entwurf"))
	}
	if name == "" {
		name = "Wassertest-Konfiguration"
	}
	return name + " Entwurf"
}

func (s *Service) UpdateDraftConfig(ctx context.Context, versionID int64, payload ConfigUpdatePayload) (ConfigVersionDetail, error) {
	version, err := s.repo.getVersion(ctx, versionID)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	if !version.IsDraft || version.IsActive {
		return ConfigVersionDetail{}, fmt.Errorf("readonly config version")
	}
	current, err := s.repo.getDetail(ctx, versionID)
	if err != nil {
		return ConfigVersionDetail{}, err
	}
	if res := validateRemovedTestsCanDelete(current.Tests, payload.Tests); !res.Valid {
		return ConfigVersionDetail{}, validationError{result: res}
	}
	detail := ConfigVersionDetail{ConfigVersion: version, Tests: payload.Tests}
	timerGroups := payload.TimerGroups
	if timerGroups == nil {
		timerGroups = current.TimerGroups
	}
	detail.TimerGroups = timerGroups
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
	if err := s.replaceVersionRows(ctx, tx, versionID, payload.Tests, timerGroups); err != nil {
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

func (s *Service) DeleteConfigVersion(ctx context.Context, versionID int64) error {
	version, err := s.repo.getVersion(ctx, versionID)
	if err != nil {
		return err
	}
	if version.IsActive {
		return fmt.Errorf("readonly active config version")
	}
	res, err := s.repo.db.ExecContext(ctx, `DELETE FROM water_test_config_versions WHERE id = ?`, versionID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func validateRemovedTestsCanDelete(current []TestConfig, next []TestConfig) ValidationResult {
	nextKeys := map[string]bool{}
	for _, test := range next {
		nextKeys[strings.TrimSpace(test.Key)] = true
	}
	var issues []ValidationIssue
	for _, test := range current {
		key := strings.TrimSpace(test.Key)
		if key == "" || nextKeys[key] || test.CanDelete {
			continue
		}
		message := test.DeleteNote
		if message == "" {
			message = "Dieser Wassertest ist bereits mit Messungen verknüpft."
		}
		issues = appendIssue(issues, "tests."+key, "linked_measurements", message)
	}
	return ValidationResult{Valid: len(issues) == 0, Errors: issues}
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

func (s *Service) replaceVersionRows(ctx context.Context, tx *sql.Tx, versionID int64, tests []TestConfig, timerGroups []TimerGroup) error {
	if _, err := tx.ExecContext(ctx, `DELETE FROM water_test_timer_steps WHERE timer_group_id IN (SELECT id FROM water_test_timer_groups WHERE config_version_id = ?)`, versionID); err != nil {
		return err
	}
	for _, table := range []string{"water_test_value_options", "water_test_thresholds", "water_test_timers", "water_test_timer_groups", "water_test_config_tests"} {
		if _, err := tx.ExecContext(ctx, `DELETE FROM `+table+` WHERE config_version_id = ?`, versionID); err != nil {
			return err
		}
	}
	for _, test := range tests {
		id, err := s.upsertDefinition(ctx, tx, test)
		if err != nil {
			return err
		}
		brand := strings.TrimSpace(test.Brand)
		if brand == "" {
			brand = "JBL"
		}
		inputType := strings.TrimSpace(test.InputType)
		if inputType == "" {
			inputType = "select"
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO water_test_config_tests (config_version_id, test_definition_id, label, brand, unit, input_type, sort_order, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, versionID, id, strings.TrimSpace(test.Label), brand, strings.TrimSpace(test.Unit), inputType, test.SortOrder, test.IsActive); err != nil {
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
	}
	if len(timerGroups) == 0 {
		timerGroups = timerGroupsFromLegacyTests(tests)
	}
	for _, group := range timerGroups {
		if err := s.insertTimerGroup(ctx, tx, versionID, group); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) insertTimerGroup(ctx context.Context, tx *sql.Tx, versionID int64, group TimerGroup) error {
	key := strings.TrimSpace(group.TestKey)
	if key == "" {
		key = timerKeyFromLabel(group.Label)
	}
	label := strings.TrimSpace(group.Label)
	if label == "" {
		label = key
	}
	res, err := tx.ExecContext(ctx, `
INSERT INTO water_test_timer_groups (config_version_id, timer_key, label, field_key, is_active, sort_order)
VALUES (?, ?, ?, ?, ?, ?)`, versionID, key, label, nullableString(group.FieldKey), group.IsActive, group.SortOrder)
	if err != nil {
		return err
	}
	groupID, err := res.LastInsertId()
	if err != nil {
		return err
	}
	for _, timer := range group.Steps {
		stepLabel := strings.TrimSpace(timer.StepLabel)
		if stepLabel == "" {
			stepLabel = timer.Label
		}
		if stepLabel == "" {
			stepLabel = "Einwirkzeit"
		}
		if _, err := tx.ExecContext(ctx, `
INSERT INTO water_test_timer_steps (timer_group_id, step_label, duration_seconds, step_order)
VALUES (?, ?, ?, ?)`, groupID, stepLabel, timer.DurationSeconds, timer.StepOrder); err != nil {
			return err
		}
	}
	return nil
}

func timerGroupsFromLegacyTests(tests []TestConfig) []TimerGroup {
	out := []TimerGroup{}
	for _, test := range tests {
		if len(test.Timers) == 0 {
			continue
		}
		out = append(out, TimerGroup{
			TestKey:   test.Key,
			Label:     test.Label,
			FieldKey:  fieldKeyForTimer(test.Key),
			IsActive:  test.IsActive,
			SortOrder: test.SortOrder,
			Steps:     test.Timers,
		})
	}
	return out
}

func timerKeyFromLabel(label string) string {
	key := strings.ToLower(strings.TrimSpace(label))
	replacer := strings.NewReplacer(" ", "_", "/", "_", "-", "_", "–", "_", "₂", "2", "₄", "4", "₃", "3")
	key = replacer.Replace(key)
	key = strings.Trim(key, "_")
	if key == "" {
		return "timer"
	}
	return key
}

func nullableString(value string) any {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return value
}

func (s *Service) upsertDefinition(ctx context.Context, tx *sql.Tx, test TestConfig) (int64, error) {
	brand := strings.TrimSpace(test.Brand)
	if brand == "" {
		brand = "JBL"
	}
	inputType := strings.TrimSpace(test.InputType)
	if inputType == "" {
		inputType = "select"
	}
	_, err := tx.ExecContext(ctx, `
INSERT INTO water_test_definitions (test_key, label, brand, unit, input_type, sort_order, is_active)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(test_key) DO UPDATE SET
  updated_at = CURRENT_TIMESTAMP`, strings.TrimSpace(test.Key), strings.TrimSpace(test.Label), brand, strings.TrimSpace(test.Unit), inputType, test.SortOrder, test.IsActive)
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
