import { severityClasses } from "@/lib/severity";

export type SeverityBadgeProps = {
  /** Severity value from the rule engine (e.g. "info" | "low" | "medium" | "high" | "critical"). */
  severity: string;
  /** Optional override of the visible text. Defaults to the severity value. */
  label?: string;
  /** Larger badge for prominent diagnosis headers. */
  size?: "md" | "lg";
};

/**
 * Small, mobile-first badge that visualizes a rule severity.
 *
 * Color mapping is centralized in lib/severity.ts; unknown severities fall
 * back to a neutral sand badge so the UI never breaks on backend changes.
 */
export function SeverityBadge({ severity, label, size = "md" }: SeverityBadgeProps) {
  const { badge } = severityClasses(severity);
  const text = label ?? severity;
  const sizing =
    size === "lg"
      ? "px-3 py-1 text-sm font-semibold"
      : "px-2.5 py-0.5 text-xs font-semibold";
  return (
    <span
      data-testid="severity-badge"
      data-severity={severity}
      data-size={size}
      className={`inline-flex items-center rounded-full ${sizing} ${badge}`}
    >
      {text}
    </span>
  );
}
