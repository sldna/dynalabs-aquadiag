import {
  type TimerId,
  type TimerStepConfig,
  type WaterTestTimerGroup,
  allTimerStepConfigs,
  findTimerStep,
  waterTestTimerId,
} from "./water-test-config";

export type TimerStatus = "idle" | "running" | "paused" | "expired";

export type TimerRuntimeState = {
  startedAt: number | null;
  endsAt: number | null;
  durationSeconds: number;
  status: TimerStatus;
  pausedRemainingSeconds: number | null;
};

export type TimerView = {
  timerId: TimerId;
  state: TimerRuntimeState;
  remainingSeconds: number;
  displayName: string;
  expiredMessage: string | null;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  isIdle: boolean;
};

export function createIdleTimer(durationSeconds: number): TimerRuntimeState {
  return {
    startedAt: null,
    endsAt: null,
    durationSeconds,
    status: "idle",
    pausedRemainingSeconds: null,
  };
}

export function initialTimerStates(groups: WaterTestTimerGroup[]): Record<TimerId, TimerRuntimeState> {
  return Object.fromEntries(
    allTimerStepConfigs(groups).map(({ timerId, step }) => [timerId, createIdleTimer(step.durationSec)]),
  );
}

export function computeRemainingSeconds(state: TimerRuntimeState, nowMs = Date.now()): number {
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

export function syncTimerState(state: TimerRuntimeState, nowMs = Date.now()): TimerRuntimeState {
  if (state.status !== "running" || state.endsAt == null) {
    return state;
  }
  if (nowMs >= state.endsAt) {
    return { ...state, status: "expired" };
  }
  return state;
}

export function syncAllTimers(
  timers: Record<TimerId, TimerRuntimeState>,
  nowMs = Date.now(),
): Record<TimerId, TimerRuntimeState> {
  let changed = false;
  const next: Record<TimerId, TimerRuntimeState> = { ...timers };
  for (const timerId of Object.keys(timers) as TimerId[]) {
    const synced = syncTimerState(timers[timerId], nowMs);
    if (synced !== timers[timerId]) {
      next[timerId] = synced;
      changed = true;
    }
  }
  return changed ? next : timers;
}

export function startTimer(state: TimerRuntimeState, nowMs = Date.now()): TimerRuntimeState {
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

export function pauseTimer(state: TimerRuntimeState, nowMs = Date.now()): TimerRuntimeState {
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

export function resetTimer(state: TimerRuntimeState): TimerRuntimeState {
  return createIdleTimer(state.durationSeconds);
}

export function timerDisplayName(groups: WaterTestTimerGroup[], timerId: TimerId): string {
  const found = findTimerStep(groups, timerId);
  if (!found) return timerId;
  const { group, step } = found;
  if (group.steps.length > 1) {
    return `${group.displayName} – ${step.stepLabel}`;
  }
  return group.displayName;
}

export function timerExpiredMessage(groups: WaterTestTimerGroup[], timerId: TimerId): string {
  return `${timerDisplayName(groups, timerId)} ist abgelaufen`;
}

export function buildTimerView(
  groups: WaterTestTimerGroup[],
  timerId: TimerId,
  state: TimerRuntimeState,
  nowMs = Date.now(),
): TimerView {
  const synced = syncTimerState(state, nowMs);
  const remainingSeconds = computeRemainingSeconds(synced, nowMs);
  const isExpired = synced.status === "expired";
  return {
    timerId,
    state: synced,
    remainingSeconds,
    displayName: timerDisplayName(groups, timerId),
    expiredMessage: isExpired ? timerExpiredMessage(groups, timerId) : null,
    isRunning: synced.status === "running",
    isPaused: synced.status === "paused",
    isExpired,
    isIdle: synced.status === "idle",
  };
}

export function buildAllTimerViews(
  groups: WaterTestTimerGroup[],
  timers: Record<TimerId, TimerRuntimeState>,
  nowMs = Date.now(),
): Record<TimerId, TimerView> {
  return Object.fromEntries(
    (Object.keys(timers) as TimerId[]).map((timerId) => [
      timerId,
      buildTimerView(groups, timerId, timers[timerId], nowMs),
    ]),
  );
}

export function findNewlyExpiredTimerIds(
  before: Record<TimerId, TimerRuntimeState>,
  after: Record<TimerId, TimerRuntimeState>,
): TimerId[] {
  return (Object.keys(after) as TimerId[]).filter((timerId) => {
    const prev = before[timerId];
    const next = after[timerId];
    return prev?.status === "running" && next?.status === "expired";
  });
}

export function timerStorageKey(tankId: number): string {
  return `aquadiag:water-test-timers:v2:${tankId}`;
}

export type PersistedTimers = Record<TimerId, TimerRuntimeState>;

export function loadTimersFromStorage(
  tankId: number,
  groups: WaterTestTimerGroup[],
  nowMs = Date.now(),
): PersistedTimers | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(timerStorageKey(tankId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimers;
    if (!parsed || typeof parsed !== "object") return null;

    const defaults = initialTimerStates(groups);
    const merged: PersistedTimers = { ...defaults };
    for (const { timerId, step } of allTimerStepConfigs(groups)) {
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
    return syncAllTimers(merged, nowMs);
  } catch {
    return null;
  }
}

export function saveTimersToStorage(tankId: number, timers: PersistedTimers): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(timerStorageKey(tankId), JSON.stringify(timers));
  } catch {
    /* Speicher voll oder privat */
  }
}

export function playTimerExpiryBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    /* Autoplay-Policy */
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

let notificationPermissionRequested = false;

export function requestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (notificationPermissionRequested) return;
  if (Notification.permission !== "default") return;
  notificationPermissionRequested = true;
  void Notification.requestPermission();
}

export function showTimerNotification(title: string, body: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, tag: "aquadiag-timer" });
    return true;
  } catch {
    return false;
  }
}

export function notifyTimerExpiry(groups: WaterTestTimerGroup[], timerId: TimerId): void {
  playTimerExpiryBeep();
  vibrateTimerExpiry();
  const title = "AquaDiag Timer";
  const body = timerExpiredMessage(groups, timerId);
  showTimerNotification(title, body);
}

export type { TimerId, TimerStepConfig, WaterTestTimerGroup };
export { waterTestTimerId };
