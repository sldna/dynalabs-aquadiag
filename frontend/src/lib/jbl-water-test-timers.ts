/**
 * Zentrale JBL-Wassertest-Timer (Quick Water Test Logging).
 * Dauer in Sekunden gemäß JBL-Produktanleitungen.
 */

export type JblTimerStepConfig = {
  stepId: string;
  stepLabel: string;
  durationSec: number;
};

export type JblWaterTestTimerGroup = {
  groupId: string;
  displayName: string;
  steps: JblTimerStepConfig[];
  /** Verknüpfung mit Quick-Water-Test-Feld, falls vorhanden */
  fieldKey?: string;
};

export const JBL_WATER_TEST_TIMER_GROUPS: readonly JblWaterTestTimerGroup[] = [
  {
    groupId: "no2",
    displayName: "NO₂",
    fieldKey: "nitrite_no2",
    steps: [{ stepId: "no2", stepLabel: "Einwirkzeit", durationSec: 5 * 60 }],
  },
  {
    groupId: "nh4",
    displayName: "NH₄",
    fieldKey: "ammonium_nh4",
    steps: [{ stepId: "nh4", stepLabel: "Einwirkzeit", durationSec: 15 * 60 }],
  },
  {
    groupId: "ph_74_90",
    displayName: "pH 7,4–9,0",
    steps: [{ stepId: "ph_74_90", stepLabel: "Einwirkzeit", durationSec: 3 * 60 }],
  },
  {
    groupId: "ph_60_76",
    displayName: "pH 6,0–7,6",
    steps: [{ stepId: "ph_60_76", stepLabel: "Einwirkzeit", durationSec: 3 * 60 }],
  },
  {
    groupId: "ph_30_100",
    displayName: "pH 3,0–10,0",
    steps: [{ stepId: "ph_30_100", stepLabel: "Einwirkzeit", durationSec: 5 * 60 }],
  },
  {
    groupId: "mg",
    displayName: "Mg",
    steps: [{ stepId: "mg", stepLabel: "Einwirkzeit", durationSec: 1 * 60 }],
  },
  {
    groupId: "o2",
    displayName: "O₂",
    steps: [
      { stepId: "o2_step1", stepLabel: "Schritt 1", durationSec: 30 },
      { stepId: "o2_step2", stepLabel: "Schritt 2", durationSec: 10 * 60 },
    ],
  },
  {
    groupId: "cu",
    displayName: "Cu",
    steps: [{ stepId: "cu", stepLabel: "Einwirkzeit", durationSec: 15 * 60 }],
  },
  {
    groupId: "k",
    displayName: "K",
    steps: [{ stepId: "k", stepLabel: "Einwirkzeit", durationSec: 1 * 60 }],
  },
  {
    groupId: "fe",
    displayName: "Fe",
    fieldKey: "iron_fe",
    steps: [{ stepId: "fe", stepLabel: "Einwirkzeit", durationSec: 10 * 60 }],
  },
  {
    groupId: "sio2",
    displayName: "SiO₂",
    steps: [
      { stepId: "sio2_step1", stepLabel: "Schritt 1", durationSec: 3 * 60 },
      { stepId: "sio2_step2", stepLabel: "Schritt 2", durationSec: 3 * 60 },
      { stepId: "sio2_step3", stepLabel: "Schritt 3", durationSec: 3 * 60 },
    ],
  },
] as const;

export type JblTimerId = string;

export function jblTimerId(groupId: string, stepId: string): JblTimerId {
  return `${groupId}:${stepId}`;
}

export function allJblTimerStepConfigs(): Array<{
  group: JblWaterTestTimerGroup;
  step: JblTimerStepConfig;
  timerId: JblTimerId;
}> {
  return JBL_WATER_TEST_TIMER_GROUPS.flatMap((group) =>
    group.steps.map((step) => ({
      group,
      step,
      timerId: jblTimerId(group.groupId, step.stepId),
    })),
  );
}

export function jblTimerGroupsForField(fieldKey: string): JblWaterTestTimerGroup[] {
  return JBL_WATER_TEST_TIMER_GROUPS.filter((g) => g.fieldKey === fieldKey);
}

export function jblTimerGroupsWithoutField(): JblWaterTestTimerGroup[] {
  return JBL_WATER_TEST_TIMER_GROUPS.filter((g) => !g.fieldKey);
}

export function findJblTimerStep(timerId: JblTimerId): {
  group: JblWaterTestTimerGroup;
  step: JblTimerStepConfig;
} | undefined {
  for (const group of JBL_WATER_TEST_TIMER_GROUPS) {
    for (const step of group.steps) {
      if (jblTimerId(group.groupId, step.stepId) === timerId) {
        return { group, step };
      }
    }
  }
  return undefined;
}
