import { describe, expect, it } from "vitest";

import {
  JBL_WATER_TEST_TIMER_GROUPS,
  allJblTimerStepConfigs,
  jblTimerId,
} from "./jbl-water-test-timers";

function groupById(id: string) {
  const g = JBL_WATER_TEST_TIMER_GROUPS.find((item) => item.groupId === id);
  if (!g) throw new Error(`Gruppe ${id} nicht gefunden`);
  return g;
}

describe("jbl-water-test-timers", () => {
  it("NO₂ hat 300 Sekunden", () => {
    expect(groupById("no2").steps[0].durationSec).toBe(300);
  });

  it("NH₄ hat 900 Sekunden", () => {
    expect(groupById("nh4").steps[0].durationSec).toBe(900);
  });

  it("O₂ hat zwei Timer: 30 und 600 Sekunden", () => {
    const o2 = groupById("o2");
    expect(o2.steps).toHaveLength(2);
    expect(o2.steps[0].durationSec).toBe(30);
    expect(o2.steps[1].durationSec).toBe(600);
  });

  it("SiO₂ hat drei Timer mit jeweils 180 Sekunden", () => {
    const sio2 = groupById("sio2");
    expect(sio2.steps).toHaveLength(3);
    expect(sio2.steps.every((s) => s.durationSec === 180)).toBe(true);
  });

  it("Fe hat 600 Sekunden", () => {
    expect(groupById("fe").steps[0].durationSec).toBe(600);
  });

  it("verwendet eindeutige Timer-IDs für alle Schritte", () => {
    const ids = allJblTimerStepConfigs().map((item) => item.timerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("O₂-Timer-IDs sind unterscheidbar", () => {
    const o2 = groupById("o2");
    expect(jblTimerId("o2", o2.steps[0].stepId)).not.toBe(jblTimerId("o2", o2.steps[1].stepId));
  });
});
