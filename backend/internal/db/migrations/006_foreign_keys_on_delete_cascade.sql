-- Enforce ON DELETE CASCADE for tank_id and water_test_id foreign keys.
--
-- Rationale: Handlers already delete in explicit transactions, but DB-level cascades
-- make referential integrity robust (e.g. when rows are deleted outside the API).
--
-- SQLite cannot alter FK constraints in-place, so we rebuild the two tables.

-- Note: Migrations run inside a transaction. SQLite does not allow toggling
-- PRAGMA foreign_keys within a transaction (it is ignored), so we must ensure
-- there is no orphaned data before we add stricter FK constraints.

-- Cleanup: remove orphan rows that would violate the new constraints.
DELETE FROM diagnosis_results
WHERE water_test_id NOT IN (SELECT id FROM water_tests);

DELETE FROM water_tests
WHERE tank_id NOT IN (SELECT id FROM tanks);

-- water_tests: tank_id -> tanks(id) ON DELETE CASCADE
ALTER TABLE water_tests RENAME TO water_tests_old;

CREATE TABLE IF NOT EXISTS water_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tank_id INTEGER NOT NULL,
  ph REAL,
  kh_dkh REAL,
  temp_c REAL,
  nitrite_mg_l REAL,
  nitrate_mg_l REAL,
  ammonium_mg_l REAL,
  oxygen_saturation_pct REAL,
  co2_mg_l REAL,
  symptoms_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  gh_dgh REAL,
  oxygen_mg_l REAL,
  FOREIGN KEY (tank_id) REFERENCES tanks (id) ON DELETE CASCADE
);

INSERT INTO water_tests (
  id, tank_id, ph, kh_dkh, temp_c, nitrite_mg_l, nitrate_mg_l, ammonium_mg_l,
  oxygen_saturation_pct, co2_mg_l, symptoms_json, notes, created_at, gh_dgh, oxygen_mg_l
)
SELECT
  id, tank_id, ph, kh_dkh, temp_c, nitrite_mg_l, nitrate_mg_l, ammonium_mg_l,
  oxygen_saturation_pct, co2_mg_l, symptoms_json, notes, created_at, gh_dgh, oxygen_mg_l
FROM water_tests_old
WHERE tank_id IN (SELECT id FROM tanks);

CREATE INDEX IF NOT EXISTS idx_water_tests_tank_id ON water_tests (tank_id);

-- diagnosis_results: water_test_id -> water_tests(id) ON DELETE CASCADE
ALTER TABLE diagnosis_results RENAME TO diagnosis_results_old;

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
  FOREIGN KEY (water_test_id) REFERENCES water_tests (id) ON DELETE CASCADE
);

INSERT INTO diagnosis_results (
  id, water_test_id, diagnosis_type, confidence, severity,
  actions_now_json, actions_optional_json, avoid_json, facts_json,
  matched_rule_ids_json, runner_up_json, explanation_json, created_at
)
SELECT
  id, water_test_id, diagnosis_type, confidence, severity,
  actions_now_json, actions_optional_json, avoid_json, facts_json,
  matched_rule_ids_json, runner_up_json, explanation_json, created_at
FROM diagnosis_results_old
WHERE water_test_id IN (SELECT id FROM water_tests);

CREATE INDEX IF NOT EXISTS idx_diagnosis_water_test_id ON diagnosis_results (water_test_id);

DROP TABLE diagnosis_results_old;
DROP TABLE water_tests_old;

