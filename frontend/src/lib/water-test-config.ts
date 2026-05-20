import { browserApiBase } from "@/lib/api-base";

export type WaterTestValueOption = {
  value: number;
  label: string;
};

export type WaterTestProfile = {
  key: string;
  label: string;
  brand: string;
  unit: string;
  input_type: "number" | "select" | string;
  values: WaterTestValueOption[];
};

export type WaterTestThresholdRange = {
  min?: number | null;
  max?: number | null;
  status: "ok" | "watch" | "critical" | string;
  message: string;
};

export type WaterTestThreshold = {
  unit: string;
  ranges: WaterTestThresholdRange[];
};

export type WaterTestTimerStep = {
  step_id: string;
  label: string;
  duration_seconds: number;
};

export type WaterTestTimer = {
  test_key: string;
  label: string;
  field_key?: string;
  steps: WaterTestTimerStep[];
};

export type WaterTestConfigResponse = {
  tests: WaterTestProfile[];
  thresholds: Record<string, WaterTestThreshold>;
  timers: Record<string, WaterTestTimer>;
};

export type ThresholdStatus = "ok" | "watch" | "critical" | "unknown";

export type ThresholdEvaluation = {
  testKey: string;
  value: number;
  status: ThresholdStatus;
  message?: string;
  unit?: string;
};

export function valueInRange(value: number, min?: number | null, max?: number | null): boolean {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

export function evaluateThreshold(
  thresholds: Record<string, WaterTestThreshold>,
  testKey: string,
  value: number,
): ThresholdEvaluation {
  const th = thresholds[testKey];
  if (!th) {
    return { testKey, value, status: "unknown" };
  }
  for (const r of th.ranges) {
    if (valueInRange(value, r.min, r.max)) {
      return {
        testKey,
        value,
        status: (r.status as ThresholdStatus) ?? "unknown",
        message: r.message,
        unit: th.unit,
      };
    }
  }
  return { testKey, value, status: "unknown", unit: th.unit };
}

export function thresholdToWaterQualityStatus(status: ThresholdStatus): string {
  switch (status) {
    case "ok":
      return "green";
    case "watch":
      return "observe";
    case "critical":
      return "critical";
    default:
      return "unknown";
  }
}

export type TimerStepConfig = {
  stepId: string;
  stepLabel: string;
  durationSec: number;
};

export type WaterTestTimerGroup = {
  groupId: string;
  displayName: string;
  fieldKey?: string;
  steps: TimerStepConfig[];
};

export function timerGroupsFromConfig(timers: Record<string, WaterTestTimer>): WaterTestTimerGroup[] {
  return Object.values(timers).map((t) => ({
    groupId: t.test_key,
    displayName: t.label,
    fieldKey: t.field_key,
    steps: t.steps.map((s) => ({
      stepId: s.step_id,
      stepLabel: s.label,
      durationSec: s.duration_seconds,
    })),
  }));
}

export type TimerId = string;

export function waterTestTimerId(groupId: string, stepId: string): TimerId {
  return `${groupId}:${stepId}`;
}

export function allTimerStepConfigs(groups: WaterTestTimerGroup[]): Array<{
  group: WaterTestTimerGroup;
  step: TimerStepConfig;
  timerId: TimerId;
}> {
  return groups.flatMap((group) =>
    group.steps.map((step) => ({
      group,
      step,
      timerId: waterTestTimerId(group.groupId, step.stepId),
    })),
  );
}

export function timerGroupsForField(groups: WaterTestTimerGroup[], fieldKey: string): WaterTestTimerGroup[] {
  return groups.filter((g) => g.fieldKey === fieldKey);
}

export function timerGroupsWithoutField(groups: WaterTestTimerGroup[]): WaterTestTimerGroup[] {
  return groups.filter((g) => !g.fieldKey);
}

export function findTimerStep(
  groups: WaterTestTimerGroup[],
  timerId: TimerId,
): { group: WaterTestTimerGroup; step: TimerStepConfig } | undefined {
  for (const group of groups) {
    for (const step of group.steps) {
      if (waterTestTimerId(group.groupId, step.stepId) === timerId) {
        return { group, step };
      }
    }
  }
  return undefined;
}

export async function fetchWaterTestConfig(): Promise<WaterTestConfigResponse> {
  const res = await fetch(`${browserApiBase()}/v1/water-test-config`, { cache: "no-store" });
  const raw: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && raw !== null && "message" in raw && typeof (raw as { message: unknown }).message === "string"
        ? (raw as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return raw as WaterTestConfigResponse;
}
