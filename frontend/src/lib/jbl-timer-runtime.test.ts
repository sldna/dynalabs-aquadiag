import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildJblTimerView,
  computeRemainingSeconds,
  createIdleTimer,
  initialJblTimerStates,
  jblTimerExpiredMessage,
  jblTimerStorageKey,
  loadJblTimersFromStorage,
  pauseJblTimer,
  resetJblTimer,
  saveJblTimersToStorage,
  startJblTimer,
  syncAllJblTimers,
  syncJblTimerState,
} from "./jbl-timer-runtime";
import { jblTimerId } from "./jbl-water-test-timers";

describe("jbl-timer-runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("zeigt Timer mit endsAt in der Vergangenheit als expired", () => {
    const now = 1_700_000_000_000;
    const state = {
      ...createIdleTimer(300),
      startedAt: now - 400_000,
      endsAt: now - 100_000,
      status: "running" as const,
      pausedRemainingSeconds: null,
    };
    const view = buildJblTimerView(jblTimerId("no2", "no2"), state, now);
    expect(view.isExpired).toBe(true);
    expect(view.remainingSeconds).toBe(0);
    expect(view.expiredMessage).toBe(jblTimerExpiredMessage(jblTimerId("no2", "no2")));
  });

  it("zeigt Timer mit endsAt in der Zukunft mit korrekter Restzeit", () => {
    const now = 1_700_000_000_000;
    const state = startJblTimer(createIdleTimer(300), now);
    const view = buildJblTimerView(jblTimerId("no2", "no2"), state, now + 120_000);
    expect(view.isExpired).toBe(false);
    expect(view.remainingSeconds).toBe(180);
  });

  it("pausiert ohne Restzeit-Verlust bei späterem now", () => {
    const now = 1_700_000_000_000;
    const running = startJblTimer(createIdleTimer(300), now);
    const paused = pauseJblTimer(running, now + 60_000);
    expect(computeRemainingSeconds(paused, now + 120_000)).toBe(240);
  });

  it("sync markiert abgelaufene running-Timer als expired", () => {
    const now = 1_700_000_000_000;
    const timers = initialJblTimerStates();
    const o2Step1 = jblTimerId("o2", "o2_step1");
    timers[o2Step1] = startJblTimer(createIdleTimer(30), now - 60_000);
    const synced = syncAllJblTimers(timers, now);
    expect(synced[o2Step1].status).toBe("expired");
  });

  it("O₂: zwei parallele Timer mit unabhängiger Restzeit", () => {
    const now = 1_700_000_000_000;
    const step1 = jblTimerId("o2", "o2_step1");
    const step2 = jblTimerId("o2", "o2_step2");
    const s1 = startJblTimer(createIdleTimer(30), now);
    const s2 = startJblTimer(createIdleTimer(600), now);
    expect(buildJblTimerView(step1, s1, now + 10_000).remainingSeconds).toBe(20);
    expect(buildJblTimerView(step2, s2, now + 10_000).remainingSeconds).toBe(590);
  });

  it("SiO₂: drei parallele Timer mit jeweils 180 Sekunden Startwert", () => {
    const now = 1_700_000_000_000;
    for (const stepId of ["sio2_step1", "sio2_step2", "sio2_step3"]) {
      const id = jblTimerId("sio2", stepId);
      const started = startJblTimer(createIdleTimer(180), now);
      expect(buildJblTimerView(id, started, now).remainingSeconds).toBe(180);
    }
  });

  it("speichert und lädt Timer aus localStorage", () => {
    const tankId = 42;
    const timers = initialJblTimerStates();
    const no2 = jblTimerId("no2", "no2");
    timers[no2] = startJblTimer(createIdleTimer(300), Date.now());
    saveJblTimersToStorage(tankId, timers);
    const loaded = loadJblTimersFromStorage(tankId);
    expect(loaded?.[no2].status).toBe("running");
    expect(loaded?.[no2].endsAt).toBe(timers[no2].endsAt);
    expect(localStorage.getItem(jblTimerStorageKey(tankId))).toBeTruthy();
  });

  it("reset setzt Timer auf idle zurück", () => {
    const running = startJblTimer(createIdleTimer(300), Date.now());
    const reset = resetJblTimer(running);
    expect(reset.status).toBe("idle");
    expect(reset.endsAt).toBeNull();
    expect(computeRemainingSeconds(reset)).toBe(300);
  });

  it("syncJblTimerState lässt paused unverändert", () => {
    const now = Date.now();
    const paused = pauseJblTimer(startJblTimer(createIdleTimer(60), now), now + 10_000);
    expect(syncJblTimerState(paused, now + 999_000).status).toBe("paused");
  });
});
