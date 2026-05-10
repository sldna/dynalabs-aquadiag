"use client";

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
  return (
    <section className="space-y-3" aria-labelledby="messwerte-heading">
      <h2 id="messwerte-heading" className="text-lg font-semibold text-aqua-deep">
        Messwerte &amp; Analysen
      </h2>
      <p className="text-sm text-aqua-deep/75">
        Chronologie der erfassten Messungen. Eine neue Diagnose startest du oben auf
        dieser Seite.
      </p>

      {waterTests === null ? (
        <p className="rounded-card border border-status-warning/40 bg-status-warning/10 p-4 text-sm text-aqua-deep">
          Messwerte konnten nicht geladen werden.
        </p>
      ) : waterTests.length === 0 ? (
        <div className="rounded-card border border-aqua-deep/10 bg-aqua-soft/60 p-4 text-sm text-aqua-deep/85">
          <p>Noch keine Messwerte vorhanden.</p>
          <p className="mt-2">
            Erfasse Symptome oder Wasserwerte über{" "}
            <span className="font-medium text-aqua-deep">Diagnose für dieses Becken</span>{" "}
            oben auf der Seite.
          </p>
        </div>
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
