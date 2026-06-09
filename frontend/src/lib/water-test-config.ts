import { browserApiBase } from "@/lib/api-base";

export type WaterTestValueOption = {
  id?: number;
  value: number;
  display_value?: string;
  label: string;
  sort_order?: number;
};

export type WaterTestProfile = {
  id?: number;
  key: string;
  label: string;
  brand: string;
  unit: string;
  input_type: "number" | "select" | string;
  sort_order?: number;
  is_active?: boolean;
  can_delete?: boolean;
  delete_blocked_reason?: string;
  values: WaterTestValueOption[];
  thresholds?: WaterTestThresholdRange[];
  timers?: WaterTestVersionTimerStep[];
};

export type WaterTestThresholdRange = {
  id?: number;
  min_value?: number | null;
  max_value?: number | null;
  min?: number | null;
  max?: number | null;
  status: "ok" | "watch" | "critical" | string;
  message: string;
  sort_order?: number;
};

export type WaterTestThreshold = {
  unit: string;
  ranges: WaterTestThresholdRange[];
};

export type WaterTestTimerStep = {
  id?: number;
  step_id: string;
  step_label?: string;
  label: string;
  duration_seconds: number;
  step_order?: number;
};

export type WaterTestVersionTimerStep = {
  id?: number;
  step_id?: string;
  step_label: string;
  label?: string;
  duration_seconds: number;
  step_order: number;
};

export type WaterTestTimer = {
  test_key: string;
  label: string;
  field_key?: string;
  steps: WaterTestTimerStep[];
};

export type WaterTestConfigResponse = {
  id?: number;
  name?: string;
  description?: string | null;
  is_active?: boolean;
  is_draft?: boolean;
  created_at?: string;
  updated_at?: string;
  activated_at?: string | null;
  tests: WaterTestProfile[];
  thresholds: Record<string, WaterTestThreshold>;
  timers: Record<string, WaterTestTimer>;
};

export type WaterTestConfigVersion = {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
  activated_at?: string | null;
};

export type WaterTestConfigVersionsResponse = {
  versions: WaterTestConfigVersion[];
};

export type WaterTestConfigValidationResult = {
  valid: boolean;
  errors: { field: string; code: string; message: string }[];
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
    if (valueInRange(value, r.min_value ?? r.min, r.max_value ?? r.max)) {
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

export function activeWaterTestProfiles(tests: WaterTestProfile[]): WaterTestProfile[] {
  return [...tests]
    .filter((test) => test.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function formWaterTestConfig(config: WaterTestConfigResponse): WaterTestConfigResponse {
  const tests = activeWaterTestProfiles(config.tests ?? []);
  const activeKeys = new Set(tests.map((test) => test.key));
  return {
    ...config,
    tests,
    thresholds: Object.fromEntries(
      Object.entries(config.thresholds ?? {}).filter(([key]) => activeKeys.has(key)),
    ),
    timers: Object.fromEntries(
      Object.entries(config.timers ?? {}).filter(([, timer]) => timerBelongsToActiveTest(timer, activeKeys)),
    ),
  };
}

function timerBelongsToActiveTest(timer: WaterTestTimer, activeKeys: Set<string>): boolean {
  return activeKeys.has(timer.test_key) || Boolean(timer.field_key && activeKeys.has(timer.field_key));
}

export function timerGroupsFromConfig(
  timers: Record<string, WaterTestTimer>,
  activeKeys?: Iterable<string>,
): WaterTestTimerGroup[] {
  const activeKeySet = activeKeys ? new Set(activeKeys) : null;
  return Object.values(timers).filter((t) => !activeKeySet || timerBelongsToActiveTest(t, activeKeySet)).map((t) => ({
    groupId: t.test_key,
    displayName: t.label,
    fieldKey: t.field_key,
    steps: t.steps.map((s) => ({
      stepId: s.step_id,
      stepLabel: s.step_label ?? s.label,
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

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${browserApiBase()}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const raw: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      raw && typeof raw === "object" && raw !== null && "message" in raw && typeof (raw as { message: unknown }).message === "string"
        ? (raw as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return raw as T;
}

export function fetchWaterTestConfigVersions(): Promise<WaterTestConfigVersionsResponse> {
  return fetchJSON<WaterTestConfigVersionsResponse>("/v1/water-test-config/versions");
}

export function fetchWaterTestConfigVersion(id: number): Promise<WaterTestConfigResponse> {
  return fetchJSON<WaterTestConfigResponse>(`/v1/water-test-config/versions/${id}`);
}

export function duplicateActiveWaterTestConfig(): Promise<WaterTestConfigResponse> {
  return fetchJSON<WaterTestConfigResponse>("/v1/water-test-config/versions/duplicate-active", { method: "POST" });
}

export function updateWaterTestConfigVersion(version: WaterTestConfigResponse): Promise<WaterTestConfigResponse> {
  return fetchJSON<WaterTestConfigResponse>(`/v1/water-test-config/versions/${version.id}`, {
    method: "PUT",
    body: JSON.stringify({ name: version.name, description: version.description, tests: version.tests }),
  });
}

export function validateWaterTestConfigVersion(id: number): Promise<WaterTestConfigValidationResult> {
  return fetchJSON<WaterTestConfigValidationResult>(`/v1/water-test-config/versions/${id}/validate`, { method: "POST" });
}

export function activateWaterTestConfigVersion(id: number): Promise<WaterTestConfigResponse> {
  return fetchJSON<WaterTestConfigResponse>(`/v1/water-test-config/versions/${id}/activate`, { method: "POST" });
}
