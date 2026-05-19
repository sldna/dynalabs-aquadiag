import { describe, expect, it } from "vitest";

import {
  normalizeWaterQualityStatus,
  waterQualityLabelDE,
} from "@/lib/water-quality";

describe("water-quality JBL status palette", () => {
  it("normalizes new statuses", () => {
    expect(normalizeWaterQualityStatus("observe")).toBe("observe");
    expect(normalizeWaterQualityStatus("warning")).toBe("warning");
    expect(normalizeWaterQualityStatus("critical")).toBe("critical");
  });

  it("maps legacy yellow/red", () => {
    expect(normalizeWaterQualityStatus("yellow")).toBe("observe");
    expect(normalizeWaterQualityStatus("red")).toBe("critical");
  });

  it("labels observe as Beobachten not Kritisch", () => {
    expect(waterQualityLabelDE("observe")).toMatch(/Beobachten/);
    expect(waterQualityLabelDE("observe")).not.toMatch(/Kritisch/);
  });
});
