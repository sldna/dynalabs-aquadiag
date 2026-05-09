-- AquaDiag V1: tanks, water_tests, diagnosis_results

CREATE TABLE IF NOT EXISTS tanks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  volume_liters REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS water_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tank_id INTEGER NOT NULL,
  ph REAL,
  kh_dkh REAL,
  temp_c REAL,
  nitrite_ppm REAL,
  nitrate_ppm REAL,
  ammonia_ppm REAL,
  oxygen_saturation_pct REAL,
  co2_ppm REAL,
  symptoms_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tank_id) REFERENCES tanks (id)
);

CREATE INDEX IF NOT EXISTS idx_water_tests_tank_id ON water_tests (tank_id);

CREATE TABLE IF NOT EXISTS diagnosis_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  water_test_id INTEGER NOT NULL,
  diagnosis_type TEXT NOT NULL,
  confidence REAL NOT NULL,
  severity TEXT NOT NULL,
  actions_now_json TEXT NOT NULL,
  actions_optional_json TEXT NOT NULL,
  avoid_json TEXT NOT NULL,
  facts_json TEXT NOT NULL,
  matched_rule_ids_json TEXT NOT NULL DEFAULT '[]',
  runner_up_json TEXT NOT NULL DEFAULT '[]',
  explanation_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (water_test_id) REFERENCES water_tests (id)
);

CREATE INDEX IF NOT EXISTS idx_diagnosis_water_test_id ON diagnosis_results (water_test_id);
