"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type JblTimerId,
  type JblTimerRuntimeState,
  type JblTimerView,
  buildAllJblTimerViews,
  findNewlyExpiredTimerIds,
  initialJblTimerStates,
  loadJblTimersFromStorage,
  notifyTimerExpiry,
  pauseJblTimer,
  resetJblTimer,
  saveJblTimersToStorage,
  startJblTimer,
  syncAllJblTimers,
} from "@/lib/jbl-timer-runtime";
const UI_REFRESH_MS = 1_000;

export function useJblWaterTestTimers(tankId: number) {
  const [timers, setTimers] = useState<Record<JblTimerId, JblTimerRuntimeState>>(() =>
    initialJblTimerStates(),
  );
  const [tick, setTick] = useState(0);
  const notifiedExpiryRef = useRef<Set<JblTimerId>>(new Set());
  const hydratedRef = useRef(false);

  const syncAndApply = useCallback(
    (updater: (prev: Record<JblTimerId, JblTimerRuntimeState>) => Record<JblTimerId, JblTimerRuntimeState>) => {
      setTimers((prev) => {
        const updated = updater(prev);
        const synced = syncAllJblTimers(updated);
        const newlyExpired = findNewlyExpiredTimerIds(prev, synced);
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "visible" &&
          newlyExpired.length > 0
        ) {
          for (const timerId of newlyExpired) {
            if (notifiedExpiryRef.current.has(timerId)) continue;
            notifiedExpiryRef.current.add(timerId);
            notifyTimerExpiry(timerId);
          }
        }
        saveJblTimersToStorage(tankId, synced);
        return synced;
      });
    },
    [tankId],
  );

  const recalculateAll = useCallback(() => {
    setTimers((prev) => {
      const synced = syncAllJblTimers(prev);
      const newlyExpired = findNewlyExpiredTimerIds(prev, synced);
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        newlyExpired.length > 0
      ) {
        for (const timerId of newlyExpired) {
          if (notifiedExpiryRef.current.has(timerId)) continue;
          notifiedExpiryRef.current.add(timerId);
          notifyTimerExpiry(timerId);
        }
      }
      if (synced !== prev) {
        saveJblTimersToStorage(tankId, synced);
      }
      return synced;
    });
    setTick((n) => n + 1);
  }, [tankId]);

  useEffect(() => {
    const stored = loadJblTimersFromStorage(tankId);
    if (stored) {
      setTimers(stored);
      setTick((n) => n + 1);
    }
    hydratedRef.current = true;
  }, [tankId]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveJblTimersToStorage(tankId, timers);
  }, [tankId, timers]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      recalculateAll();
    }, UI_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [recalculateAll]);

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

  const views: Record<JblTimerId, JblTimerView> = buildAllJblTimerViews(timers);

  const startTimer = useCallback(
    (timerId: JblTimerId) => {
      syncAndApply((prev) => {
        const current = prev[timerId];
        if (!current) return prev;
        notifiedExpiryRef.current.delete(timerId);
        return { ...prev, [timerId]: startJblTimer(current) };
      });
      setTick((n) => n + 1);
    },
    [syncAndApply],
  );

  const pauseTimer = useCallback(
    (timerId: JblTimerId) => {
      syncAndApply((prev) => {
        const current = prev[timerId];
        if (!current) return prev;
        return { ...prev, [timerId]: pauseJblTimer(current) };
      });
      setTick((n) => n + 1);
    },
    [syncAndApply],
  );

  const resetTimer = useCallback(
    (timerId: JblTimerId) => {
      syncAndApply((prev) => {
        const current = prev[timerId];
        if (!current) return prev;
        return { ...prev, [timerId]: resetJblTimer(current) };
      });
      notifiedExpiryRef.current.delete(timerId);
      setTick((n) => n + 1);
    },
    [syncAndApply],
  );

  void tick;

  return {
    views,
    startTimer,
    pauseTimer,
    resetTimer,
  };
}
