"use client";

import Link from "next/link";

import type { WaterTest } from "@/lib/types";

import { WaterTestMeasurementCard } from "./WaterTestMeasurementCard";

export type WaterMeasurementsSectionProps = {
  tankId: number;
  /** `null` wenn die Liste nicht geladen werden konnte */
  waterTests: WaterTest[] | null;
};

export function WaterMeasurementsSection({
  tankId,
  waterTests,
}: WaterMeasurementsSectionProps) {
  const diagnoseHref = `/dashboard/diagnose?tank=${tankId}`;

  return (
    <section className="space-y-3" aria-labelledby="messwerte-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="messwerte-heading" className="text-lg font-semibold text-aqua-deep">
          Messwerte
        </h2>
        <Link
          href={diagnoseHref}
          className="inline-flex shrink-0 items-center justify-center rounded-button bg-aqua-blue px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#168EAA] sm:w-auto"
        >
          Neue Analyse starten
        </Link>
      </div>

      {waterTests === null ? (
        <p className="rounded-card border border-status-warning/40 bg-status-warning/10 p-4 text-sm text-aqua-deep">
          Messwerte konnten nicht geladen werden.
        </p>
      ) : waterTests.length === 0 ? (
        <p className="rounded-card border border-aqua-deep/10 bg-aqua-soft/60 p-4 text-sm text-aqua-deep/85">
          Noch keine Messwerte vorhanden
        </p>
      ) : (
        <ul className="space-y-3">
          {waterTests.map((wt) => (
            <li key={wt.id}>
              <WaterTestMeasurementCard tankId={tankId} test={wt} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
