import { describe, expect, it } from "vitest";

import type { WaterTest } from "@/lib/types";

import { measurementRowsForWaterTest } from "./water-test-rows";

function baseTest(over: Partial<WaterTest>): WaterTest {
  return {
    id: 1,
    tank_id: 2,
    symptoms: [],
    created_at: "2026-05-08T12:00:00Z",
    ...over,
  };
}

describe("measurementRowsForWaterTest", () => {
  it("returns rows only for present numeric fields in the specified order", () => {
    const rows = measurementRowsForWaterTest(
      baseTest({
        nitrite_mg_l: 0.05,
        ph: 7.2,
        nitrate_mg_l: 12,
        kh_dkh: 6,
        co2_mg_l: 15,
        oxygen_saturation_pct: 98,
      }),
    );

    expect(rows.map((r) => r.label)).toEqual([
      "Nitrit",
      "Nitrat",
      "pH",
      "KH",
      "CO₂",
      "O₂-Sättigung",
    ]);
    expect(rows[0]?.value).toMatch(/0[,.]05/);
    expect(rows[2]?.value).toMatch(/7[,.]2/);
  });

  it("includes symptoms when non-empty", () => {
    const rows = measurementRowsForWaterTest(
      baseTest({
        symptoms: ["Algen", "  trüb "],
      }),
    );
    expect(rows).toEqual([{ label: "Symptome", value: "Algen, trüb" }]);
  });

  it("omits null and undefined measurements", () => {
    expect(
      measurementRowsForWaterTest(
        baseTest({
          nitrite_mg_l: null,
          ph: undefined,
          symptoms: [],
        }),
      ),
    ).toEqual([]);
  });
});
