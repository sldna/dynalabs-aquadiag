import {
  normalizeWaterQualityStatus,
  waterQualityClasses,
  waterQualityLabelDE,
  waterQualitySummaryHeadlineDE,
} from "@/lib/water-quality";
import type { WaterQualityItem, WaterQualityStatus } from "@/lib/types";

import { WaterQualityItemCard } from "./WaterQualityItemCard";

export type WaterQualitySummaryProps = {
  status?: WaterQualityStatus | string | null;
  items?: WaterQualityItem[] | null;
  /** Optional headline override; defaults to a status-aware German headline. */
  headline?: string;
  /** Hide the embedded item list (e.g. when items render elsewhere). */
  withItems?: boolean;
};

/**
 * Summary panel for the per-test traffic-light assessment.
 *
 * Renders gracefully when no values are measured ("Nicht bewertet") and
 * intentionally avoids any chart/visualization in line with V1 scope.
 *
 * IMPORTANT: This is an *orientation* layer for the UI only. It does not
 * affect the deterministic diagnosis from the rule engine.
 */
export function WaterQualitySummary({
  status,
  items,
  headline,
  withItems = true,
}: WaterQualitySummaryProps) {
  const normalized = normalizeWaterQualityStatus(status);
  const list = Array.isArray(items) ? items : [];
  const { cardBg, cardAccent } = waterQualityClasses(normalized);
  const headlineText = headline ?? waterQualitySummaryHeadlineDE(normalized);

  return (
    <section
      data-testid="water-quality-summary"
      data-status={normalized}
      aria-labelledby="wq-summary-heading"
      className={`rounded-card border border-aqua-deep/10 ${cardBg} ${cardAccent} p-4 sm:p-5`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
            Wasserqualität
          </p>
          <h3
            id="wq-summary-heading"
            className="mt-0.5 text-base font-semibold text-aqua-deep sm:text-lg"
          >
            {headlineText}
          </h3>
        </div>
        <span className="text-xs font-medium text-aqua-deep/65">
          {waterQualityLabelDE(normalized)}
        </span>
      </header>

      <p className="mt-2 text-xs text-aqua-deep/65">
        Orientierung anhand der Messwerte. Ersetzt keine Diagnose.
      </p>

      {withItems && list.length > 0 ? (
        <ul className="mt-4 grid grid-cols-1 gap-3">
          {list.map((it) => (
            <li key={it.key}>
              <WaterQualityItemCard item={it} />
            </li>
          ))}
        </ul>
      ) : null}

      {withItems && list.length === 0 ? (
        <p className="mt-4 text-sm text-aqua-deep/75">
          Noch keine bewertbaren Messwerte. Erfasse Nitrit, pH und weitere
          Werte, um eine Einschätzung zu erhalten.
        </p>
      ) : null}
    </section>
  );
}
