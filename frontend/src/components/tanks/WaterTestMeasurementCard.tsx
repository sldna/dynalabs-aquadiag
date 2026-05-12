"use client";

import Link from "next/link";

import { WaterQualityBadge } from "@/components/water-quality";
import { formatDateTimeDE } from "@/lib/date";
import { measurementRowsForWaterTest } from "@/lib/water-test-rows";
import type { WaterTest } from "@/lib/types";

import { DeleteWaterTestDialog } from "./DeleteWaterTestDialog";

export type WaterTestMeasurementCardProps = {
  tankId: number;
  test: WaterTest;
};

export function WaterTestMeasurementCard({ tankId, test }: WaterTestMeasurementCardProps) {
  const when = formatDateTimeDE(test.created_at);
  const rows = measurementRowsForWaterTest(test);

  return (
    <article
      className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
      aria-label={when ? `Messung vom ${when}` : "Messung"}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm font-semibold text-aqua-deep">
            {when ?? "—"}
          </p>
          <WaterQualityBadge status={test.water_quality_status} />
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link
            href={`/dashboard/tanks/${tankId}/water-tests/${test.id}`}
            className="rounded-button border border-aqua-blue bg-white px-3 py-2 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft"
          >
            Details
          </Link>
          <DeleteWaterTestDialog waterTestId={test.id} />
        </div>
      </header>

      {rows.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-2 gap-y-0.5">
              <dt className="text-aqua-deep/60">{row.label}</dt>
              <dd className="font-medium text-aqua-deep">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-aqua-deep/65">
          Keine Messwerte oder Symptome erfasst.
        </p>
      )}
    </article>
  );
}
