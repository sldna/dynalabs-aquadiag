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
    badge:
      "bg-status-info/22 text-status-info ring-2 ring-status-info/45 shadow-sm",
  },
  green: {
    badge:
      "bg-status-success/22 text-status-success ring-2 ring-status-success/45 shadow-sm",
  },
  yellow: {
    badge:
      "bg-status-warning/35 text-aqua-deep ring-2 ring-status-warning/55 shadow-sm",
  },
  orange: {
    badge:
      "bg-status-alert/22 text-status-alert ring-2 ring-status-alert/50 shadow-sm",
  },
  red: {
    badge:
      "bg-status-critical/22 text-status-critical ring-2 ring-status-critical/50 shadow-sm",
  },
  slate: {
    badge: "bg-aqua-sand text-aqua-deep ring-2 ring-aqua-deep/30 shadow-sm",
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

/** Left accent stripe + subtle tinted panel for hero diagnosis cards. */
export type SeverityHeroAccentClasses = {
  wrap: string;
};

const COLOR_TO_HERO_ACCENT: Record<SeverityColor, SeverityHeroAccentClasses> = {
  blue: {
    wrap: "border-l-[6px] border-l-status-info bg-status-info/[0.07]",
  },
  green: {
    wrap: "border-l-[6px] border-l-status-success bg-status-success/[0.08]",
  },
  yellow: {
    wrap: "border-l-[6px] border-l-status-warning bg-status-warning/[0.12]",
  },
  orange: {
    wrap: "border-l-[6px] border-l-status-alert bg-status-alert/[0.08]",
  },
  red: {
    wrap: "border-l-[6px] border-l-status-critical bg-status-critical/[0.08]",
  },
  slate: {
    wrap: "border-l-[6px] border-l-aqua-deep/25 bg-aqua-soft/80",
  },
};

export function severityHeroAccent(severity: string): SeverityHeroAccentClasses {
  return COLOR_TO_HERO_ACCENT[severityColor(severity)];
}

/** Short German label for badges (accessibility: status not conveyed by color alone). */
export function severityLabelDE(severity: string): string {
  switch (severity) {
    case "info":
      return "Info";
    case "low":
      return "Gering";
    case "medium":
      return "Mittel";
    case "high":
      return "Hoch";
    case "critical":
      return "Kritisch";
    default:
      return severity || "Unbekannt";
  }
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
