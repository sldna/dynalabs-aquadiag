import type { WaterTest } from "@/lib/types";

function fmtNum(n: number): string {
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function presentNumber(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && typeof v === "number" && !Number.isNaN(v);
}

/**
 * Reihenfolge und Labels für die Messwert-Karten (ohne Zeitstempel).
 */
export function measurementRowsForWaterTest(test: WaterTest): {
  label: string;
  value: string;
}[] {
  const rows: { label: string; value: string }[] = [];

  if (presentNumber(test.nitrite_mg_l)) {
    rows.push({ label: "Nitrit NO₂", value: `${fmtNum(test.nitrite_mg_l)} mg/l` });
  }
  if (presentNumber(test.nitrate_mg_l)) {
    rows.push({ label: "Nitrat NO₃", value: `${fmtNum(test.nitrate_mg_l)} mg/l` });
  }
  if (presentNumber(test.ph)) {
    rows.push({ label: "pH-Wert", value: fmtNum(test.ph) });
  }
  if (presentNumber(test.temp_c)) {
    rows.push({ label: "Temperatur", value: `${fmtNum(test.temp_c)} °C` });
  }
  if (presentNumber(test.kh_dkh)) {
    rows.push({ label: "KH", value: `${fmtNum(test.kh_dkh)} °dKH` });
  }
  if (presentNumber(test.gh_dgh)) {
    rows.push({ label: "GH", value: `${fmtNum(test.gh_dgh)} °dGH` });
  }
  if (presentNumber(test.ammonium_mg_l)) {
    rows.push({ label: "Ammonium NH₄", value: `${fmtNum(test.ammonium_mg_l)} mg/l` });
  }
  if (presentNumber(test.phosphate_po4)) {
    rows.push({ label: "Phosphat PO₄", value: `${fmtNum(test.phosphate_po4)} mg/l` });
  }
  if (presentNumber(test.iron_fe)) {
    rows.push({ label: "Eisen Fe", value: `${fmtNum(test.iron_fe)} mg/l` });
  }
  if (presentNumber(test.co2_mg_l)) {
    rows.push({ label: "CO₂", value: `${fmtNum(test.co2_mg_l)} mg/l` });
  }
  if (presentNumber(test.oxygen_saturation_pct)) {
    rows.push({
      label: "O₂-Sättigung",
      value: `${fmtNum(test.oxygen_saturation_pct)} %`,
    });
  }

  const symptoms = Array.isArray(test.symptoms) ? test.symptoms : [];
  const symText = symptoms.map((s) => s.trim()).filter(Boolean);
  if (symText.length > 0) {
    rows.push({ label: "Symptome", value: symText.join(", ") });
  }

  return rows;
}
