import type { WaterTestConfigResponse } from "./water-test-config";

/** Minimal config fixture for Vitest (mirrors backend/config defaults). */
export const MOCK_WATER_TEST_CONFIG: WaterTestConfigResponse = {
  tests: [
    {
      key: "ph",
      label: "pH",
      brand: "JBL",
      unit: "",
      input_type: "number",
      values: [],
    },
    {
      key: "nitrite_no2",
      label: "Nitrit (NO₂)",
      brand: "JBL",
      unit: "mg/l",
      input_type: "select",
      values: [{ value: 0, label: "0" }],
    },
    {
      key: "nitrate_no3",
      label: "Nitrat (NO₃)",
      brand: "JBL",
      unit: "mg/l",
      input_type: "select",
      values: [
        { value: 0, label: "0" },
        { value: 0.5, label: "0,5" },
      ],
    },
    {
      key: "ammonium_nh4",
      label: "Ammonium (NH₄)",
      brand: "JBL",
      unit: "mg/l",
      input_type: "select",
      values: [{ value: 0, label: "0" }],
    },
    {
      key: "iron_fe",
      label: "Eisen (Fe)",
      brand: "JBL",
      unit: "mg/l",
      input_type: "select",
      values: [{ value: 0, label: "0" }],
    },
  ],
  thresholds: {
    nitrate_no3: {
      unit: "mg/l",
      ranges: [
        { min: 0, max: 30, status: "ok", message: "Nitrat liegt im üblichen Bereich." },
        { min: 30, max: 50, status: "watch", message: "Nitrat ist erhöht." },
        { min: 50, max: 100, status: "watch", message: "Nitrat ist deutlich erhöht." },
        { min: 100, max: null, status: "critical", message: "Nitrat ist sehr hoch." },
      ],
    },
    nitrite_no2: {
      unit: "mg/l",
      ranges: [
        { min: 0, max: 0.1, status: "ok", message: "ok" },
        { min: 0.5, max: null, status: "critical", message: "kritisch" },
      ],
    },
  },
  timers: {
    no2: {
      test_key: "no2",
      label: "NO₂",
      field_key: "nitrite_no2",
      steps: [{ step_id: "no2", label: "Einwirkzeit", duration_seconds: 300 }],
    },
    nh4: {
      test_key: "nh4",
      label: "NH₄",
      field_key: "ammonium_nh4",
      steps: [{ step_id: "nh4", label: "Einwirkzeit", duration_seconds: 900 }],
    },
    o2: {
      test_key: "o2",
      label: "O₂",
      steps: [
        { step_id: "o2_step1", label: "Schritt 1", duration_seconds: 30 },
        { step_id: "o2_step2", label: "Schritt 2", duration_seconds: 600 },
      ],
    },
    sio2: {
      test_key: "sio2",
      label: "SiO₂",
      steps: [
        { step_id: "sio2_step1", label: "Schritt 1", duration_seconds: 180 },
        { step_id: "sio2_step2", label: "Schritt 2", duration_seconds: 180 },
        { step_id: "sio2_step3", label: "Schritt 3", duration_seconds: 180 },
      ],
    },
    fe: {
      test_key: "fe",
      label: "Fe",
      field_key: "iron_fe",
      steps: [{ step_id: "fe", label: "Einwirkzeit", duration_seconds: 600 }],
    },
    ph_74_90: {
      test_key: "ph_74_90",
      label: "pH 7,4–9,0",
      steps: [{ step_id: "ph_74_90", label: "Einwirkzeit", duration_seconds: 180 }],
    },
  },
};
