import type { Severity } from "@/lib/severity";

export type Tank = {
  id: number;
  name: string;
  volume_liters: number;
  notes?: string | null;
  created_at: string;
  last_water_test_at?: string | null;
  latest_diagnosis_type?: string | null;
  latest_diagnosis_severity?: Severity | string | null;
  latest_diagnosis_confidence?: number | null;
};

export type TanksListResponse = {
  tanks: Tank[];
};

/**
 * Traffic-light status for an individual water value or the whole water test.
 * Mirrors backend/internal/waterquality.Status.
 */
export type WaterQualityStatus = "green" | "yellow" | "red" | "unknown";

/**
 * One classified water value as returned by the backend assessment.
 * Mirrors backend/internal/waterquality.Item.
 */
export type WaterQualityItem = {
  key: string;
  label: string;
  value: number;
  unit?: string;
  status: WaterQualityStatus;
  message: string;
  recommendation_short?: string;
};

export type WaterTest = {
  id: number;
  tank_id: number;
  ph?: number | null;
  kh_dkh?: number | null;
  gh_dgh?: number | null;
  temp_c?: number | null;
  nitrite_mg_l?: number | null;
  nitrate_mg_l?: number | null;
  ammonium_mg_l?: number | null;
  oxygen_mg_l?: number | null;
  oxygen_saturation_pct?: number | null;
  co2_mg_l?: number | null;
  symptoms: string[];
  notes?: string | null;
  created_at: string;
  /** Overall traffic-light status across all measured values (since M3.5). */
  water_quality_status?: WaterQualityStatus;
  /** Per-value traffic-light items (since M3.5); empty array when nothing measured. */
  water_quality_items?: WaterQualityItem[];
};

export type WaterTestsListResponse = {
  water_tests: WaterTest[];
};

export type WaterValueSignal = {
  field: string;
  label_de: string;
  value: number;
  unit?: string;
};

export type ScoreBreakdown = {
  base: number;
  symptom_bonuses?: Record<string, number>;
  water_bonuses?: Record<string, number>;
  symptom_subtotal: number;
  water_subtotal: number;
  capped_total: number;
};

export type DiagnosisItem = {
  rule_id: string;
  name: string;
  diagnosis_type: string;
  category?: string;
  tags?: string[];
  // Severity is validated server-side at YAML load time. The string fallback
  // is only here to keep the UI defensive against a future backend that adds
  // a value before the frontend mapping is updated.
  severity: Severity | string;
  confidence: number;
  uncertainty_note_de?: string;
  summary_de: string;
  reasoning_de: string;
  actions_now: string[];
  actions_optional: string[];
  avoid: string[];
  follow_up_questions_de: string[];
  safety_note_de: string;
  facts: string[];
  matched_conditions?: string[];
  matched_symptoms?: string[];
  matched_water_values?: WaterValueSignal[];
  score_breakdown?: ScoreBreakdown;
};

export type ExcludedRule = {
  rule_id: string;
  diagnosis_type?: string;
  reason: string;
};

export type FollowUpAnswerPair = {
  question: string;
  answer: string;
};

export type DiagnosisStatus = "matched" | "unknown";

export type DiagnosisMeta = {
  rule_engine_version: string;
  evaluated_rules: number;
  matched_count: number;
  generated_at: string;
  ai_status?: "disabled" | "ok" | "failed" | string;
  diagnosis_id: number;
  water_test_id: number;
  tank_id: number;
};

export type AIExplanation = {
  summary: string;
  reasoning_public: string;
  actions_now: string[];
  actions_optional: string[];
  avoid: string[];
  follow_up_questions: string[];
  safety_note: string;
};

export type DiagnoseMatchedResponse = {
  status: "matched";
  top_diagnosis: DiagnosisItem | null;
  diagnoses: DiagnosisItem[];
  matched_rules: string[];
  excluded_rules?: ExcludedRule[];
  ai_explanation?: AIExplanation | null;
  /** User answers to follow_up_questions_de (keys "0", "1", …); persisted via PATCH /v1/diagnoses/{id}. */
  follow_up_answers?: Record<string, string>;
  meta: DiagnosisMeta;
};

// The backend may legitimately return only `{ status: "unknown" }`.
// Keep the UI defensive by making all other fields optional.
export type DiagnoseUnknownResponse = {
  status: "unknown";
  top_diagnosis?: DiagnosisItem | null;
  diagnoses?: DiagnosisItem[];
  matched_rules?: string[];
  excluded_rules?: ExcludedRule[];
  ai_explanation?: AIExplanation | null;
  follow_up_answers?: Record<string, string>;
  meta?: DiagnosisMeta;
};

export type DiagnoseAPIResponse = DiagnoseMatchedResponse | DiagnoseUnknownResponse;
