import { severityClasses } from "@/lib/severity";

export type SeverityBadgeProps = {
  /** Severity value from the rule engine (e.g. "info" | "low" | "medium" | "high" | "critical"). */
  severity: string;
  /** Optional override of the visible text. Defaults to the severity value. */
  label?: string;
};

/**
 * Small, mobile-first badge that visualizes a rule severity.
 *
 * Color mapping is centralized in lib/severity.ts; unknown severities fall
 * back to a neutral sand badge so the UI never breaks on backend changes.
 */
export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  const { badge } = severityClasses(severity);
  const text = label ?? severity;
  return (
    <span
      data-testid="severity-badge"
      data-severity={severity}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badge}`}
    >
      {text}
    </span>
  );
}
