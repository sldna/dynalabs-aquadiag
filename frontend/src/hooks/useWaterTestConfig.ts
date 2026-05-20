"use client";

import { useEffect, useState } from "react";

import {
  type WaterTestConfigResponse,
  type WaterTestTimerGroup,
  fetchWaterTestConfig,
  timerGroupsFromConfig,
} from "@/lib/water-test-config";

export type WaterTestConfigState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | {
      status: "ready";
      config: WaterTestConfigResponse;
      timerGroups: WaterTestTimerGroup[];
    };

export function useWaterTestConfig(): WaterTestConfigState {
  const [state, setState] = useState<WaterTestConfigState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await fetchWaterTestConfig();
        if (cancelled) return;
        if (!config.tests?.length) {
          setState({ status: "empty" });
          return;
        }
        setState({
          status: "ready",
          config,
          timerGroups: timerGroupsFromConfig(config.timers ?? {}),
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "Konfiguration konnte nicht geladen werden.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
