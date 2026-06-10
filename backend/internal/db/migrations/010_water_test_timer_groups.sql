CREATE TABLE IF NOT EXISTS water_test_timer_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_version_id INTEGER NOT NULL,
  timer_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_key TEXT,
  is_active BOOLEAN NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (config_version_id) REFERENCES water_test_config_versions(id) ON DELETE CASCADE,
  UNIQUE (config_version_id, timer_key)
);

CREATE TABLE IF NOT EXISTS water_test_timer_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timer_group_id INTEGER NOT NULL,
  step_label TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  step_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (timer_group_id) REFERENCES water_test_timer_groups(id) ON DELETE CASCADE,
  CHECK (duration_seconds > 0)
);

INSERT OR IGNORE INTO water_test_timer_groups (
  config_version_id,
  timer_key,
  label,
  field_key,
  is_active,
  sort_order
)
SELECT DISTINCT
  t.config_version_id,
  d.test_key,
  d.label,
  CASE d.test_key
    WHEN 'no2' THEN 'nitrite_no2'
    WHEN 'nh4' THEN 'ammonium_nh4'
    WHEN 'fe' THEN 'iron_fe'
    WHEN 'o2' THEN 'oxygen_mg_l'
    ELSE NULL
  END,
  CASE d.test_key
    WHEN 'no2' THEN 1
    WHEN 'nh4' THEN 1
    WHEN 'fe' THEN 1
    ELSE d.is_active
  END,
  d.sort_order
FROM water_test_timers t
JOIN water_test_definitions d ON d.id = t.test_definition_id;

INSERT INTO water_test_timer_steps (
  timer_group_id,
  step_label,
  duration_seconds,
  step_order
)
SELECT
  g.id,
  t.step_label,
  t.duration_seconds,
  t.step_order
FROM water_test_timers t
JOIN water_test_definitions d ON d.id = t.test_definition_id
JOIN water_test_timer_groups g
  ON g.config_version_id = t.config_version_id
 AND g.timer_key = d.test_key
WHERE NOT EXISTS (
  SELECT 1
  FROM water_test_timer_steps s
  WHERE s.timer_group_id = g.id
    AND s.step_order = t.step_order
);

DELETE FROM water_test_config_tests
WHERE test_definition_id IN (
  SELECT id
  FROM water_test_definitions
  WHERE test_key IN ('no2', 'nh4', 'ph_74_90', 'ph_60_76', 'ph_30_100', 'mg', 'o2', 'cu', 'k', 'fe', 'sio2')
);
