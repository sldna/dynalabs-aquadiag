import {
  type JblTimerId,
  allJblTimerStepConfigs,
  findJblTimerStep,
  jblTimerId,
} from "./jbl-water-test-timers";

export type JblTimerStatus = "idle" | "running" | "paused" | "expired";

/** Persistierter Timer-Zustand; Restzeit wird aus endsAt berechnet. */
export type JblTimerRuntimeState = {
  startedAt: number | null;
  endsAt: number | null;
  durationSeconds: number;
  status: JblTimerStatus;
  /** Verbleibende Sekunden bei Pause (Source of Truth während paused). */
  pausedRemainingSeconds: number | null;
};

export type JblTimerView = {
  timerId: JblTimerId;
  state: JblTimerRuntimeState;
  remainingSeconds: number;
  displayName: string;
  expiredMessage: string | null;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  isIdle: boolean;
};

export function createIdleTimer(durationSeconds: number): JblTimerRuntimeState {
  return {
    startedAt: null,
    endsAt: null,
    durationSeconds,
    status: "idle",
    pausedRemainingSeconds: null,
  };
}

export function initialJblTimerStates(): Record<JblTimerId, JblTimerRuntimeState> {
  return Object.fromEntries(
    allJblTimerStepConfigs().map(({ timerId, step }) => [
      timerId,
      createIdleTimer(step.durationSec),
    ]),
  );
}

export function computeRemainingSeconds(state: JblTimerRuntimeState, nowMs = Date.now()): number {
  if (state.status === "idle") {
    return state.durationSeconds;
  }
  if (state.status === "paused" && state.pausedRemainingSeconds != null) {
    return state.pausedRemainingSeconds;
  }
  if (state.status === "expired") {
    return 0;
  }
  if (state.endsAt != null) {
    return Math.max(0, Math.ceil((state.endsAt - nowMs) / 1000));
  }
  return state.durationSeconds;
}

export function syncJblTimerState(
  state: JblTimerRuntimeState,
  nowMs = Date.now(),
): JblTimerRuntimeState {
  if (state.status !== "running" || state.endsAt == null) {
    return state;
  }
  if (nowMs >= state.endsAt) {
    return { ...state, status: "expired" };
  }
  return state;
}

export function syncAllJblTimers(
  timers: Record<JblTimerId, JblTimerRuntimeState>,
  nowMs = Date.now(),
): Record<JblTimerId, JblTimerRuntimeState> {
  let changed = false;
  const next: Record<JblTimerId, JblTimerRuntimeState> = { ...timers };
  for (const timerId of Object.keys(timers) as JblTimerId[]) {
    const synced = syncJblTimerState(timers[timerId], nowMs);
    if (synced !== timers[timerId]) {
      next[timerId] = synced;
      changed = true;
    }
  }
  return changed ? next : timers;
}

export function startJblTimer(state: JblTimerRuntimeState, nowMs = Date.now()): JblTimerRuntimeState {
  const remaining =
    state.status === "paused" && state.pausedRemainingSeconds != null
      ? state.pausedRemainingSeconds
      : state.durationSeconds;
  const endsAt = nowMs + remaining * 1000;
  return {
    ...state,
    startedAt: nowMs,
    endsAt,
    status: "running",
    pausedRemainingSeconds: null,
  };
}

export function pauseJblTimer(state: JblTimerRuntimeState, nowMs = Date.now()): JblTimerRuntimeState {
  if (state.status !== "running") {
    return state;
  }
  const remaining = computeRemainingSeconds(state, nowMs);
  return {
    ...state,
    endsAt: null,
    status: "paused",
    pausedRemainingSeconds: remaining,
  };
}

export function resetJblTimer(state: JblTimerRuntimeState): JblTimerRuntimeState {
  return createIdleTimer(state.durationSeconds);
}

export function jblTimerDisplayName(timerId: JblTimerId): string {
  const found = findJblTimerStep(timerId);
  if (!found) return timerId;
  const { group, step } = found;
  if (group.steps.length > 1) {
    return `${group.displayName} – ${step.stepLabel}`;
  }
  return group.displayName;
}

export function jblTimerExpiredMessage(timerId: JblTimerId): string {
  return `${jblTimerDisplayName(timerId)} ist abgelaufen`;
}

export function buildJblTimerView(
  timerId: JblTimerId,
  state: JblTimerRuntimeState,
  nowMs = Date.now(),
): JblTimerView {
  const synced = syncJblTimerState(state, nowMs);
  const remainingSeconds = computeRemainingSeconds(synced, nowMs);
  const isExpired = synced.status === "expired";
  return {
    timerId,
    state: synced,
    remainingSeconds,
    displayName: jblTimerDisplayName(timerId),
    expiredMessage: isExpired ? jblTimerExpiredMessage(timerId) : null,
    isRunning: synced.status === "running",
    isPaused: synced.status === "paused",
    isExpired,
    isIdle: synced.status === "idle",
  };
}

export function buildAllJblTimerViews(
  timers: Record<JblTimerId, JblTimerRuntimeState>,
  nowMs = Date.now(),
): Record<JblTimerId, JblTimerView> {
  return Object.fromEntries(
    (Object.keys(timers) as JblTimerId[]).map((timerId) => [
      timerId,
      buildJblTimerView(timerId, timers[timerId], nowMs),
    ]),
  );
}

export function findNewlyExpiredTimerIds(
  before: Record<JblTimerId, JblTimerRuntimeState>,
  after: Record<JblTimerId, JblTimerRuntimeState>,
): JblTimerId[] {
  return (Object.keys(after) as JblTimerId[]).filter((timerId) => {
    const prev = before[timerId];
    const next = after[timerId];
    return prev?.status === "running" && next?.status === "expired";
  });
}

export function jblTimerStorageKey(tankId: number): string {
  return `aquadiag:jbl-timers:v1:${tankId}`;
}

export type PersistedJblTimers = Record<JblTimerId, JblTimerRuntimeState>;

export function loadJblTimersFromStorage(tankId: number): PersistedJblTimers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(jblTimerStorageKey(tankId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedJblTimers;
    if (!parsed || typeof parsed !== "object") return null;

    const defaults = initialJblTimerStates();
    const merged: PersistedJblTimers = { ...defaults };
    for (const { timerId, step } of allJblTimerStepConfigs()) {
      const stored = parsed[timerId];
      if (!stored || typeof stored.durationSeconds !== "number") continue;
      merged[timerId] = {
        startedAt: typeof stored.startedAt === "number" ? stored.startedAt : null,
        endsAt: typeof stored.endsAt === "number" ? stored.endsAt : null,
        durationSeconds: step.durationSec,
        status:
          stored.status === "running" ||
          stored.status === "paused" ||
          stored.status === "expired" ||
          stored.status === "idle"
            ? stored.status
            : "idle",
        pausedRemainingSeconds:
          typeof stored.pausedRemainingSeconds === "number" ? stored.pausedRemainingSeconds : null,
      };
    }
    return syncAllJblTimers(merged);
  } catch {
    return null;
  }
}

export function saveJblTimersToStorage(tankId: number, timers: PersistedJblTimers): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(jblTimerStorageKey(tankId), JSON.stringify(timers));
  } catch {
    /* Speicher voll oder privat – still ignorieren */
  }
}

/** Kurzer Signalton; Fehler werden still ignoriert. */
export function playTimerExpiryBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      void ctx.close();
    };
  } catch {
    /* Autoplay-Policy o. Ä. – kein UI-Fehler */
  }
}

export function vibrateTimerExpiry(): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([200, 100, 200]);
  } catch {
    /* nicht unterstützt */
  }
}

export function notifyTimerExpiry(timerId: JblTimerId): void {
  playTimerExpiryBeep();
  vibrateTimerExpiry();
  void timerId;
}

export type { JblTimerId } from "./jbl-water-test-timers";
export { jblTimerId };
