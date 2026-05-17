import { describe, expect, it } from "vitest";

import type { WaterTest } from "@/lib/types";

import {
  chartPointsForMetric,
  filterWaterTestsByRange,
  metricsWithData,
  STANDARD_CHART_METRICS,
} from "./water-chart-data";

const baseTest = (id: number, createdAt: string, overrides: Partial<WaterTest> = {}): WaterTest => ({
  id,
  tank_id: 1,
  created_at: createdAt,
  symptoms: [],
  ...overrides,
});

describe("water-chart-data", () => {
  it("filters tests by 7 day range", () => {
    const now = Date.now();
    const recent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const old = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
    const tests = [
      baseTest(1, recent, { ph: 7.0 }),
      baseTest(2, old, { ph: 7.1 }),
    ];

    const filtered = filterWaterTestsByRange(tests, "7d");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(1);
  });

  it("builds chronological chart points skipping null values", () => {
    const tests = [
      baseTest(2, "2026-05-10T12:00:00Z", { ph: 7.4 }),
      baseTest(1, "2026-05-08T12:00:00Z", { ph: 7.0 }),
    ];

    const points = chartPointsForMetric(tests, "ph");
    expect(points).toEqual([
      { at: "2026-05-08T12:00:00Z", value: 7.0 },
      { at: "2026-05-10T12:00:00Z", value: 7.4 },
    ]);
  });

  it("returns only metrics with at least one value", () => {
    const tests = [baseTest(1, "2026-05-08T12:00:00Z", { nitrite_mg_l: 0.1 })];
    const metrics = metricsWithData(tests, STANDARD_CHART_METRICS);
    expect(metrics.map((m) => m.key)).toEqual(["nitrite_mg_l"]);
  });
});
