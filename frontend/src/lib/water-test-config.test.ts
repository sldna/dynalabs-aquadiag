import { describe, expect, it } from "vitest";

import { evaluateThreshold, formWaterTestConfig, timerGroupsFromConfig } from "./water-test-config";
import { MOCK_WATER_TEST_CONFIG } from "./water-test-config.fixture";

describe("water-test-config", () => {
  it("NO3 0.5 wird als ok bewertet", () => {
    const got = evaluateThreshold(MOCK_WATER_TEST_CONFIG.thresholds, "nitrate_no3", 0.5);
    expect(got.status).toBe("ok");
  });

  it("rendert Timer-Gruppen aus API-Config", () => {
    const groups = timerGroupsFromConfig(MOCK_WATER_TEST_CONFIG.timers);
    const o2 = groups.find((g) => g.groupId === "o2");
    expect(o2?.steps).toHaveLength(2);
    expect(o2?.steps[0].durationSec).toBe(30);
    expect(o2?.steps[1].durationSec).toBe(600);
  });

  it("filtert inaktive Messwerte und deren Standalone-Timer aus dem Formular", () => {
    const config = formWaterTestConfig(MOCK_WATER_TEST_CONFIG);
    expect(config.tests.some((test) => test.key === "copper_cu")).toBe(false);
    expect(config.tests.some((test) => test.key === "nitrite_no2")).toBe(true);
  });
});
