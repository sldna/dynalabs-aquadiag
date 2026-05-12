/**
 * Helpers for the M3.5 water-quality traffic-light layer.
 *
 * The mapping is intentionally narrow: each status maps to one tone of the
 * existing AquaDiag status palette (see tailwind.config.ts safelist). Unknown
 * values fall back to a neutral sand badge so missing measurements never look
 * like an error.
 *
 * Important: this is an orientation layer for the UI only. The deterministic
 * rule engine remains the single source of truth for diagnoses.
 */
import type { WaterQualityStatus } from "@/lib/types";

export type WaterQualityClassNames = {
  /** Background, text and ring classes for the badge pill. */
  badge: string;
  /** Solid dot color, used inline next to a value. */
  dot: string;
  /** Subtle tinted background for card-style items. */
  cardBg: string;
  /** Left accent border for card-style items. */
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
  yellow: {
    badge:
      "bg-status-warning/35 text-aqua-deep ring-2 ring-status-warning/55 shadow-sm",
    dot: "bg-status-warning",
    cardBg: "bg-status-warning/[0.12]",
    cardAccent: "border-l-[6px] border-l-status-warning",
  },
  red: {
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
  "yellow",
  "red",
  "unknown",
]);

/** Type guard with graceful fallback so the UI never crashes on a new value. */
export function normalizeWaterQualityStatus(
  status: string | null | undefined,
): WaterQualityStatus {
  if (typeof status === "string" && VALID.has(status as WaterQualityStatus)) {
    return status as WaterQualityStatus;
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
    case "yellow":
      return "Beobachten";
    case "red":
      return "Kritisch";
    case "unknown":
    default:
      return "Nicht bewertet";
  }
}

/** Slightly longer headline for the per-test summary banner. */
export function waterQualitySummaryHeadlineDE(
  status: string | null | undefined,
): string {
  switch (normalizeWaterQualityStatus(status)) {
    case "green":
      return "Wasserwerte unauffällig";
    case "yellow":
      return "Wasserwerte beobachten";
    case "red":
      return "Wasserwerte kritisch";
    case "unknown":
    default:
      return "Noch keine bewertbaren Werte";
  }
}

/** Locale-aware number formatting for the value display. */
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
