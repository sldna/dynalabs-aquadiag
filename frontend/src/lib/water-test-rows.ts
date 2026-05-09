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
    rows.push({ label: "Nitrit", value: `${fmtNum(test.nitrite_mg_l)} mg/l` });
  }
  if (presentNumber(test.nitrate_mg_l)) {
    rows.push({ label: "Nitrat", value: `${fmtNum(test.nitrate_mg_l)} mg/l` });
  }
  if (presentNumber(test.ph)) {
    rows.push({ label: "pH", value: fmtNum(test.ph) });
  }
  if (presentNumber(test.kh_dkh)) {
    rows.push({ label: "KH", value: `${fmtNum(test.kh_dkh)} °dKH` });
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
