import type { WaterTest } from "@/lib/types";

export type WaterChartRange = "7d" | "30d" | "all";

export type WaterChartMetricKey =
  | "ph"
  | "nitrite_mg_l"
  | "nitrate_mg_l"
  | "temp_c"
  | "kh_dkh"
  | "gh_dgh"
  | "ammonium_mg_l"
  | "co2_mg_l";

export type WaterChartMetric = {
  key: WaterChartMetricKey;
  label: string;
  unit?: string;
};

export const STANDARD_CHART_METRICS: WaterChartMetric[] = [
  { key: "ph", label: "pH-Wert" },
  { key: "nitrite_mg_l", label: "Nitrit NO₂", unit: "mg/l" },
  { key: "nitrate_mg_l", label: "Nitrat NO₃", unit: "mg/l" },
  { key: "temp_c", label: "Temperatur", unit: "°C" },
];

export const OPTIONAL_CHART_METRICS: WaterChartMetric[] = [
  { key: "kh_dkh", label: "KH", unit: "°dKH" },
  { key: "gh_dgh", label: "GH", unit: "°dGH" },
  { key: "ammonium_mg_l", label: "Ammonium NH₄", unit: "mg/l" },
  { key: "co2_mg_l", label: "CO₂", unit: "mg/l" },
];

export type WaterChartPoint = {
  at: string;
  value: number;
};

function parseCreatedAt(isoLike: string): Date | null {
  const trimmed = isoLike.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function presentNumber(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && typeof v === "number" && !Number.isNaN(v);
}

export function filterWaterTestsByRange(
  tests: WaterTest[],
  range: WaterChartRange,
): WaterTest[] {
  if (range === "all" || tests.length === 0) {
    return tests;
  }

  const days = range === "7d" ? 7 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return tests.filter((test) => {
    const date = parseCreatedAt(test.created_at);
    return date !== null && date.getTime() >= cutoff;
  });
}

export function chartPointsForMetric(
  tests: WaterTest[],
  key: WaterChartMetricKey,
): WaterChartPoint[] {
  const chronological = [...tests].reverse();

  const points: WaterChartPoint[] = [];
  for (const test of chronological) {
    const value = test[key];
    if (!presentNumber(value)) {
      continue;
    }
    points.push({ at: test.created_at, value });
  }
  return points;
}

export function metricsWithData(
  tests: WaterTest[],
  metrics: WaterChartMetric[],
): WaterChartMetric[] {
  return metrics.filter((metric) => chartPointsForMetric(tests, metric.key).length > 0);
}

export function countMeasurementsWithValues(tests: WaterTest[]): number {
  return tests.filter((test) =>
    STANDARD_CHART_METRICS.concat(OPTIONAL_CHART_METRICS).some((metric) =>
      presentNumber(test[metric.key]),
    ),
  ).length;
}
