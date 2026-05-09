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
};

export type WaterTestsListResponse = {
  water_tests: WaterTest[];
};

export type DiagnosisItem = {
  rule_id: string;
  name: string;
  diagnosis_type: string;
  // Severity is validated server-side at YAML load time. The string fallback
  // is only here to keep the UI defensive against a future backend that adds
  // a value before the frontend mapping is updated.
  severity: Severity | string;
  confidence: number;
  summary_de: string;
  reasoning_de: string;
  actions_now: string[];
  actions_optional: string[];
  avoid: string[];
  follow_up_questions_de: string[];
  safety_note_de: string;
  facts: string[];
};

export type DiagnosisStatus = "matched" | "unknown";

export type DiagnosisMeta = {
  rule_engine_version: string;
  evaluated_rules: number;
  matched_count: number;
  generated_at: string;
  diagnosis_id: number;
  water_test_id: number;
  tank_id: number;
};

export type DiagnoseMatchedResponse = {
  status: "matched";
  top_diagnosis: DiagnosisItem | null;
  diagnoses: DiagnosisItem[];
  matched_rules: string[];
  meta: DiagnosisMeta;
};

// The backend may legitimately return only `{ status: "unknown" }`.
// Keep the UI defensive by making all other fields optional.
export type DiagnoseUnknownResponse = {
  status: "unknown";
  top_diagnosis?: DiagnosisItem | null;
  diagnoses?: DiagnosisItem[];
  matched_rules?: string[];
  meta?: DiagnosisMeta;
};

export type DiagnoseAPIResponse = DiagnoseMatchedResponse | DiagnoseUnknownResponse;
