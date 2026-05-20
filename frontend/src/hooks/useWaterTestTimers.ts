"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type TimerId,
  type TimerRuntimeState,
  type TimerView,
  type WaterTestTimerGroup,
  buildAllTimerViews,
  findNewlyExpiredTimerIds,
  initialTimerStates,
  loadTimersFromStorage,
  notifyTimerExpiry,
  pauseTimer,
  requestNotificationPermission,
  resetTimer,
  saveTimersToStorage,
  startTimer,
  syncAllTimers,
} from "@/lib/water-test-timer-runtime";

const UI_REFRESH_MS = 1_000;

export function useWaterTestTimers(tankId: number, timerGroups: WaterTestTimerGroup[] | null) {
  const groups = timerGroups ?? [];
  const groupsKey = groups.map((g) => g.groupId).join(",");
  const [timers, setTimers] = useState<Record<TimerId, TimerRuntimeState>>({});
  const [tick, setTick] = useState(0);
  const notifiedExpiryRef = useRef<Set<TimerId>>(new Set());
  const hydratedRef = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const syncAndApply = useCallback(
    (updater: (prev: Record<TimerId, TimerRuntimeState>) => Record<TimerId, TimerRuntimeState>) => {
      if (groups.length === 0) return;
      setTimers((prev) => {
        const updated = updater(prev);
        const synced = syncAllTimers(updated);
        const newlyExpired = findNewlyExpiredTimerIds(prev, synced);
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "visible" &&
          newlyExpired.length > 0
        ) {
          for (const timerId of newlyExpired) {
            if (notifiedExpiryRef.current.has(timerId)) continue;
            notifiedExpiryRef.current.add(timerId);
            notifyTimerExpiry(groups, timerId);
          }
        }
        saveTimersToStorage(tankId, synced);
        return synced;
      });
    },
    [tankId, groups],
  );

  const recalculateAll = useCallback(() => {
    if (groups.length === 0) return;
    setTimers((prev) => {
      const synced = syncAllTimers(prev);
      const newlyExpired = findNewlyExpiredTimerIds(prev, synced);
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        newlyExpired.length > 0
      ) {
        for (const timerId of newlyExpired) {
          if (notifiedExpiryRef.current.has(timerId)) continue;
          notifiedExpiryRef.current.add(timerId);
          notifyTimerExpiry(groups, timerId);
        }
      }
      if (synced !== prev) {
        saveTimersToStorage(tankId, synced);
      }
      return synced;
    });
    setTick((n) => n + 1);
  }, [tankId, groups]);

  useEffect(() => {
    if (groups.length === 0) return;
    const stored = loadTimersFromStorage(tankId, groups);
    setTimers(stored ?? initialTimerStates(groups));
    setTick((n) => n + 1);
    hydratedRef.current = true;
  }, [tankId, groupsKey, groups]);

  useEffect(() => {
    if (!hydratedRef.current || groups.length === 0) return;
    saveTimersToStorage(tankId, timers);
  }, [tankId, timers, groups]);

  useEffect(() => {
    if (groups.length === 0) return;
    const intervalId = window.setInterval(() => {
      recalculateAll();
    }, UI_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [recalculateAll, groups]);

  useEffect(() => {
    const onVisible = () => recalculateAll();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [recalculateAll]);

  const views: Record<TimerId, TimerView> =
    groups.length > 0 ? buildAllTimerViews(groups, timers) : {};

  const startTimerFn = useCallback(
    (timerId: TimerId) => {
      syncAndApply((prev) => {
        const current = prev[timerId];
        if (!current) return prev;
        notifiedExpiryRef.current.delete(timerId);
        return { ...prev, [timerId]: startTimer(current) };
      });
      setTick((n) => n + 1);
    },
    [syncAndApply],
  );

  const pauseTimerFn = useCallback(
    (timerId: TimerId) => {
      syncAndApply((prev) => {
        const current = prev[timerId];
        if (!current) return prev;
        return { ...prev, [timerId]: pauseTimer(current) };
      });
      setTick((n) => n + 1);
    },
    [syncAndApply],
  );

  const resetTimerFn = useCallback(
    (timerId: TimerId) => {
      syncAndApply((prev) => {
        const current = prev[timerId];
        if (!current) return prev;
        return { ...prev, [timerId]: resetTimer(current) };
      });
      notifiedExpiryRef.current.delete(timerId);
      setTick((n) => n + 1);
    },
    [syncAndApply],
  );

  void tick;

  return {
    views,
    startTimer: startTimerFn,
    pauseTimer: pauseTimerFn,
    resetTimer: resetTimerFn,
  };
}
