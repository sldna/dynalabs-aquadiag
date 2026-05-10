-- Optional structured diagnosis context captured alongside measurements (JSON object).
ALTER TABLE water_tests ADD COLUMN diagnosis_context_json TEXT;
