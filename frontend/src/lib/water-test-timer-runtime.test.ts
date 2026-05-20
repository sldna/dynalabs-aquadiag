import { afterEach, describe, expect, it, vi } from "vitest";

import { timerGroupsFromConfig } from "./water-test-config";
import { MOCK_WATER_TEST_CONFIG } from "./water-test-config.fixture";
import {
  buildTimerView,
  computeRemainingSeconds,
  createIdleTimer,
  initialTimerStates,
  loadTimersFromStorage,
  pauseTimer,
  resetTimer,
  saveTimersToStorage,
  startTimer,
  syncAllTimers,
  syncTimerState,
  timerExpiredMessage,
  timerStorageKey,
  waterTestTimerId,
} from "./water-test-timer-runtime";

const TIMER_GROUPS = timerGroupsFromConfig(MOCK_WATER_TEST_CONFIG.timers);

describe("water-test-timer-runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("zeigt Timer mit endsAt in der Vergangenheit als expired", () => {
    const now = 1_700_000_000_000;
    const timerId = waterTestTimerId("no2", "no2");
    const state = {
      ...createIdleTimer(300),
      startedAt: now - 400_000,
      endsAt: now - 100_000,
      status: "running" as const,
      pausedRemainingSeconds: null,
    };
    const view = buildTimerView(TIMER_GROUPS, timerId, state, now);
    expect(view.isExpired).toBe(true);
    expect(view.remainingSeconds).toBe(0);
    expect(view.expiredMessage).toBe(timerExpiredMessage(TIMER_GROUPS, timerId));
  });

  it("berechnet Restzeit aus endsAt (Date.now)", () => {
    const now = 1_700_000_000_000;
    const state = startTimer(createIdleTimer(300), now);
    expect(computeRemainingSeconds(state, now + 120_000)).toBe(180);
  });

  it("stellt laufende Timer nach Reload aus localStorage wieder her", () => {
    const tankId = 7;
    const now = 1_700_000_000_000;
    const timerId = waterTestTimerId("no2", "no2");
    const endsAt = now + 240_000;
    saveTimersToStorage(tankId, {
      [timerId]: {
        startedAt: now,
        endsAt,
        durationSeconds: 300,
        status: "running",
        pausedRemainingSeconds: null,
      },
    });

    const at = now + 60_000;
    const loaded = loadTimersFromStorage(tankId, TIMER_GROUPS, at);
    expect(loaded).not.toBeNull();
    const remaining = computeRemainingSeconds(loaded![timerId], at);
    expect(remaining).toBe(180);
  });

  it("O₂ und SiO₂: Mehrschritt-Timer unabhängig", () => {
    const now = 1_700_000_000_000;
    const step1 = waterTestTimerId("o2", "o2_step1");
    const step2 = waterTestTimerId("o2", "o2_step2");
    const s1 = startTimer(createIdleTimer(30), now);
    const s2 = startTimer(createIdleTimer(600), now);
    expect(buildTimerView(TIMER_GROUPS, step1, s1, now + 10_000).remainingSeconds).toBe(20);
    expect(buildTimerView(TIMER_GROUPS, step2, s2, now + 10_000).remainingSeconds).toBe(590);

    const timers = initialTimerStates(TIMER_GROUPS);
    for (const stepId of ["sio2_step1", "sio2_step2", "sio2_step3"]) {
      const id = waterTestTimerId("sio2", stepId);
      timers[id] = startTimer(createIdleTimer(180), now);
      expect(buildTimerView(TIMER_GROUPS, id, timers[id], now).remainingSeconds).toBe(180);
    }
  });

  it("sync markiert abgelaufene running-Timer als expired", () => {
    const now = 1_700_000_000_000;
    const timers = initialTimerStates(TIMER_GROUPS);
    const o2Step1 = waterTestTimerId("o2", "o2_step1");
    timers[o2Step1] = startTimer(createIdleTimer(30), now - 60_000);
    const synced = syncAllTimers(timers, now);
    expect(synced[o2Step1].status).toBe("expired");
  });

  it("pause und reset", () => {
    const now = 1_700_000_000_000;
    const running = startTimer(createIdleTimer(300), now);
    const paused = pauseTimer(running, now + 60_000);
    expect(computeRemainingSeconds(paused, now + 120_000)).toBe(240);
    expect(resetTimer(paused).status).toBe("idle");
    expect(syncTimerState(running, now + 400_000).status).toBe("expired");
  });

  it("nutzt v2 localStorage-Key", () => {
    expect(timerStorageKey(3)).toBe("aquadiag:water-test-timers:v2:3");
  });
});
