/**
 * Helpers for the M3.5 water-quality traffic-light layer (JBL-aligned).
 *
 * Status palette: green → observe → warning → critical (plus unknown).
 * Legacy API values yellow/red are normalized to observe/critical.
 *
 * Important: orientation layer for the UI only. The rule engine decides diagnoses.
 */
import type { WaterQualityStatus } from "@/lib/types";

export type WaterQualityClassNames = {
  badge: string;
  dot: string;
  cardBg: string;
  cardAccent: string;
};

const CLASSES: Record<WaterQualityStatus, WaterQualityClassNames> = {
  green: {
    badge:
      "bg-status-success/22 text-status-success ring-2 ring-status-success/45 shadow-sm",
    dot: "bg-status-success",
    cardBg: "bg-status-success/[0.08]",
    cardAccent: "border-l-[6px] border-l-status-success",
  },
  observe: {
    badge:
      "bg-status-info/20 text-aqua-deep ring-2 ring-status-info/40 shadow-sm",
    dot: "bg-status-info",
    cardBg: "bg-status-info/[0.08]",
    cardAccent: "border-l-[6px] border-l-status-info",
  },
  warning: {
    badge:
      "bg-status-warning/35 text-aqua-deep ring-2 ring-status-warning/55 shadow-sm",
    dot: "bg-status-warning",
    cardBg: "bg-status-warning/[0.12]",
    cardAccent: "border-l-[6px] border-l-status-warning",
  },
  critical: {
    badge:
      "bg-status-critical/22 text-status-critical ring-2 ring-status-critical/50 shadow-sm",
    dot: "bg-status-critical",
    cardBg: "bg-status-critical/[0.08]",
    cardAccent: "border-l-[6px] border-l-status-critical",
  },
  unknown: {
    badge: "bg-aqua-sand text-aqua-deep ring-2 ring-aqua-deep/30 shadow-sm",
    dot: "bg-aqua-deep/30",
    cardBg: "bg-aqua-soft/80",
    cardAccent: "border-l-[6px] border-l-aqua-deep/25",
  },
};

const VALID: ReadonlySet<WaterQualityStatus> = new Set<WaterQualityStatus>([
  "green",
  "observe",
  "warning",
  "critical",
  "unknown",
]);

/** Maps deprecated yellow/red from older API responses. */
function legacyStatusMap(status: string): WaterQualityStatus | null {
  switch (status) {
    case "yellow":
      return "observe";
    case "red":
      return "critical";
    default:
      return null;
  }
}

export function normalizeWaterQualityStatus(
  status: string | null | undefined,
): WaterQualityStatus {
  if (typeof status === "string") {
    const legacy = legacyStatusMap(status);
    if (legacy) {
      return legacy;
    }
    if (VALID.has(status as WaterQualityStatus)) {
      return status as WaterQualityStatus;
    }
  }
  return "unknown";
}

export function waterQualityClasses(
  status: string | null | undefined,
): WaterQualityClassNames {
  return CLASSES[normalizeWaterQualityStatus(status)];
}

/** Short German label for a traffic-light status. */
export function waterQualityLabelDE(
  status: string | null | undefined,
): string {
  switch (normalizeWaterQualityStatus(status)) {
    case "green":
      return "Unauffällig";
    case "observe":
      return "Beobachten";
    case "warning":
      return "Warnung";
    case "critical":
      return "Kritisch";
    case "unknown":
    default:
      return "Nicht bewertet";
  }
}

export function waterQualitySummaryHeadlineDE(
  status: string | null | undefined,
): string {
  switch (normalizeWaterQualityStatus(status)) {
    case "green":
      return "Wasserwerte unauffällig";
    case "observe":
      return "Wasserwerte beobachten";
    case "warning":
      return "Wasserwerte: Warnung";
    case "critical":
      return "Wasserwerte kritisch";
    case "unknown":
    default:
      return "Noch keine bewertbaren Werte";
  }
}

export function formatWaterQualityValue(
  value: number,
  unit?: string,
): string {
  const formatted = Number(value).toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}
