CREATE TABLE IF NOT EXISTS water_test_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'JBL',
  unit TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'select',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS water_test_config_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT 0,
  is_draft BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at TEXT,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS water_test_value_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_version_id INTEGER NOT NULL,
  test_definition_id INTEGER NOT NULL,
  value REAL NOT NULL,
  display_value TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (config_version_id) REFERENCES water_test_config_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (test_definition_id) REFERENCES water_test_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS water_test_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_version_id INTEGER NOT NULL,
  test_definition_id INTEGER NOT NULL,
  min_value REAL,
  max_value REAL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (config_version_id) REFERENCES water_test_config_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (test_definition_id) REFERENCES water_test_definitions(id) ON DELETE CASCADE,
  CHECK (status IN ('ok', 'watch', 'critical'))
);

CREATE TABLE IF NOT EXISTS water_test_timers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_version_id INTEGER NOT NULL,
  test_definition_id INTEGER NOT NULL,
  step_label TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (config_version_id) REFERENCES water_test_config_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (test_definition_id) REFERENCES water_test_definitions(id) ON DELETE CASCADE,
  CHECK (duration_seconds > 0)
);

ALTER TABLE water_tests ADD COLUMN config_snapshot_json TEXT;
ALTER TABLE water_tests ADD COLUMN threshold_results_snapshot_json TEXT;
ALTER TABLE water_tests ADD COLUMN config_version_name TEXT;
ALTER TABLE water_tests ADD COLUMN config_version_created_at TEXT;
