import {
  formatWaterQualityValue,
  normalizeWaterQualityStatus,
  waterQualityClasses,
} from "@/lib/water-quality";
import type { WaterQualityItem } from "@/lib/types";

import { WaterQualityBadge } from "./WaterQualityBadge";

export type WaterQualityItemCardProps = {
  item: WaterQualityItem;
};

/**
 * Card for one classified water value: label, value+unit, status badge and a
 * short explanation/recommendation. Mobile-first: keeps to a single column,
 * primary information first.
 */
export function WaterQualityItemCard({ item }: WaterQualityItemCardProps) {
  const status = normalizeWaterQualityStatus(item.status);
  const { cardBg, cardAccent } = waterQualityClasses(status);

  return (
    <article
      data-testid="water-quality-item-card"
      data-key={item.key}
      data-status={status}
      className={`rounded-card border border-aqua-deep/10 ${cardBg} ${cardAccent} p-4`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
            {item.label}
          </p>
          <p className="mt-0.5 text-base font-semibold text-aqua-deep">
            {formatWaterQualityValue(item.value, item.unit)}
          </p>
        </div>
        <WaterQualityBadge status={status} />
      </header>

      {item.message ? (
        <p className="mt-2 text-sm text-aqua-deep/85">{item.message}</p>
      ) : null}

      {item.recommendation_short ? (
        <p className="mt-1 text-sm font-medium text-aqua-deep">
          {item.recommendation_short}
        </p>
      ) : null}
    </article>
  );
}
