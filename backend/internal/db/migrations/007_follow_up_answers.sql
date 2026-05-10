-- Persist user answers to rule-engine follow-up questions (JSON object, string keys).
ALTER TABLE diagnosis_results ADD COLUMN follow_up_answers_json TEXT NOT NULL DEFAULT '{}';
