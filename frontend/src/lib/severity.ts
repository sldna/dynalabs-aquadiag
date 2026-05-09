/**
 * Canonical severity classification.
 *
 * Must stay in sync with backend/internal/rules/severity.go (AllowedSeverities)
 * and the README severity table. Adding a value requires updating all three
 * locations in the same change.
 */
export const SEVERITIES = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type Severity = (typeof SEVERITIES)[number];

/** Color tokens used by the UI (pure mapping, framework-agnostic). */
export type SeverityColor =
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "slate";

const SEVERITY_TO_COLOR: Record<Severity, SeverityColor> = {
  info: "blue",
  low: "green",
  medium: "yellow",
  high: "orange",
  critical: "red",
};

/** Tailwind class set for the SeverityBadge per color. */
export type SeverityBadgeClasses = {
  /** Background, text and ring classes — applied together on the badge. */
  badge: string;
};

// Class strings are intentionally written as full literals so Tailwind's
// content scanner picks them up without a safelist.
const COLOR_TO_CLASSES: Record<SeverityColor, SeverityBadgeClasses> = {
  blue: {
    badge: "bg-status-info/15 text-status-info ring-status-info/30",
  },
  green: {
    badge: "bg-status-success/15 text-status-success ring-status-success/30",
  },
  yellow: {
    badge: "bg-status-warning/25 text-aqua-deep ring-status-warning/40",
  },
  orange: {
    badge: "bg-status-alert/15 text-status-alert ring-status-alert/35",
  },
  red: {
    badge: "bg-status-critical/15 text-status-critical ring-status-critical/35",
  },
  slate: {
    badge: "bg-aqua-sand text-aqua-deep ring-aqua-deep/20",
  },
};

/** Type guard: true when s is one of the canonical severity values. */
export function isSeverity(s: unknown): s is Severity {
  return typeof s === "string" && (SEVERITIES as readonly string[]).includes(s);
}

/**
 * Map a severity string to a color token.
 *
 * Unknown values fall back to "slate" so a backend-side regression
 * never breaks the UI; in dev the console warns once per unknown value.
 */
export function severityColor(severity: string): SeverityColor {
  if (isSeverity(severity)) {
    return SEVERITY_TO_COLOR[severity];
  }
  warnUnknownSeverity(severity);
  return "slate";
}

/** Tailwind class set for a severity (single source of truth). */
export function severityClasses(severity: string): SeverityBadgeClasses {
  return COLOR_TO_CLASSES[severityColor(severity)];
}

const warnedUnknown = new Set<string>();
function warnUnknownSeverity(value: string): void {
  if (process.env.NODE_ENV === "production") return;
  if (warnedUnknown.has(value)) return;
  warnedUnknown.add(value);
  console.warn(
    `severity: unknown value ${JSON.stringify(value)}; falling back to slate. Allowed: ${SEVERITIES.join(", ")}`,
  );
}
