CREATE TABLE IF NOT EXISTS water_test_config_tests (
  config_version_id INTEGER NOT NULL,
  test_definition_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'JBL',
  unit TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'select',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  PRIMARY KEY (config_version_id, test_definition_id),
  FOREIGN KEY (config_version_id) REFERENCES water_test_config_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (test_definition_id) REFERENCES water_test_definitions(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO water_test_config_tests (
  config_version_id,
  test_definition_id,
  label,
  brand,
  unit,
  input_type,
  sort_order,
  is_active
)
SELECT
  v.id,
  d.id,
  d.label,
  d.brand,
  d.unit,
  d.input_type,
  d.sort_order,
  d.is_active
FROM water_test_config_versions v
JOIN water_test_definitions d
WHERE d.is_active = 1
   OR d.id IN (SELECT test_definition_id FROM water_test_value_options WHERE config_version_id = v.id)
   OR d.id IN (SELECT test_definition_id FROM water_test_thresholds WHERE config_version_id = v.id)
   OR d.id IN (SELECT test_definition_id FROM water_test_timers WHERE config_version_id = v.id);
