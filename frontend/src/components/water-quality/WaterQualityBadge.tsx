import {
  waterQualityClasses,
  waterQualityLabelDE,
  normalizeWaterQualityStatus,
} from "@/lib/water-quality";
import type { WaterQualityStatus } from "@/lib/types";

export type WaterQualityBadgeProps = {
  status: WaterQualityStatus | string | null | undefined;
  /** Optional override of the visible text; defaults to the German label. */
  label?: string;
  size?: "md" | "lg";
};

/**
 * Mobile-first traffic-light badge for water test cards.
 *
 * Accessibility: the German label is always rendered so the meaning is
 * conveyed by text, not by color alone.
 */
export function WaterQualityBadge({
  status,
  label,
  size = "md",
}: WaterQualityBadgeProps) {
  const normalized = normalizeWaterQualityStatus(status);
  const { badge, dot } = waterQualityClasses(normalized);
  const text = label ?? waterQualityLabelDE(normalized);
  const sizing =
    size === "lg"
      ? "px-3 py-1 text-sm font-semibold gap-2"
      : "px-2.5 py-0.5 text-xs font-semibold gap-1.5";
  const dotSize = size === "lg" ? "h-2.5 w-2.5" : "h-2 w-2";

  return (
    <span
      data-testid="water-quality-badge"
      data-status={normalized}
      data-size={size}
      className={`inline-flex items-center rounded-full ${sizing} ${badge}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block rounded-full ${dotSize} ${dot}`}
      />
      <span>{text}</span>
    </span>
  );
}
