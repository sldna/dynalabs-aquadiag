"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { WaterTest } from "@/lib/types";
import {
  OPTIONAL_CHART_METRICS,
  STANDARD_CHART_METRICS,
  chartPointsForMetric,
  filterWaterTestsByRange,
  metricsWithData,
  type WaterChartMetric,
  type WaterChartRange,
} from "@/lib/water-chart-data";

import { WaterValueChart } from "./WaterValueChart";
import { WaterValueHistoryCard } from "./WaterValueHistoryCard";

export type WaterValueHistorySectionProps = {
  tankId: number;
  /** `null` wenn die Liste nicht geladen werden konnte */
  waterTests: WaterTest[] | null;
};

const RANGE_OPTIONS: { value: WaterChartRange; label: string }[] = [
  { value: "7d", label: "7 Tage" },
  { value: "30d", label: "30 Tage" },
  { value: "all", label: "Alle" },
];

export function WaterValueHistorySection({
  tankId,
  waterTests,
}: WaterValueHistorySectionProps) {
  const [range, setRange] = useState<WaterChartRange>("30d");
  const [showOptionalCharts, setShowOptionalCharts] = useState(false);

  const diagnoseHref = `/dashboard/diagnose?tank=${tankId}`;

  const filteredTests = useMemo(() => {
    if (!waterTests) {
      return [];
    }
    return filterWaterTestsByRange(waterTests, range);
  }, [waterTests, range]);

  const standardMetrics = useMemo(
    () => metricsWithData(filteredTests, STANDARD_CHART_METRICS),
    [filteredTests],
  );

  const optionalMetrics = useMemo(
    () => metricsWithData(filteredTests, OPTIONAL_CHART_METRICS),
    [filteredTests],
  );

  const chartMetrics: WaterChartMetric[] = showOptionalCharts
    ? [...standardMetrics, ...optionalMetrics]
    : standardMetrics;

  const hasAnyChartData = chartMetrics.length > 0;
  const measurementCount = waterTests?.length ?? 0;

  return (
    <section className="space-y-6" aria-labelledby="wasserwerte-heading">
      <SectionHeader diagnoseHref={diagnoseHref} />

      {waterTests === null ? (
        <p
          role="alert"
          className="rounded-card border border-status-warning/40 bg-status-warning/10 p-4 text-sm text-aqua-deep"
        >
          Wasserwerte konnten nicht geladen werden.
        </p>
      ) : measurementCount === 0 ? (
        <EmptyHistoryState diagnoseHref={diagnoseHref} />
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex rounded-button border border-aqua-deep/15 bg-white p-0.5"
                role="group"
                aria-label="Zeitraum"
              >
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRange(option.value)}
                    aria-pressed={range === option.value}
                    className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                      range === option.value
                        ? "bg-aqua-blue text-white"
                        : "text-aqua-deep hover:bg-aqua-soft"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {optionalMetrics.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowOptionalCharts((value) => !value)}
                  aria-pressed={showOptionalCharts}
                  className="rounded-button border border-aqua-blue bg-white px-3 py-1.5 text-xs font-semibold text-aqua-deep hover:bg-aqua-soft"
                >
                  {showOptionalCharts ? "Zusatzwerte ausblenden" : "KH, GH, NH₄, CO₂ anzeigen"}
                </button>
              ) : null}
            </div>

            {measurementCount === 1 ? (
              <p className="text-sm text-aqua-deep/75">
                Für einen Verlauf werden mindestens zwei Messungen benötigt.
              </p>
            ) : null}

            {hasAnyChartData ? (
              <ChartsRow chartMetrics={chartMetrics} filteredTests={filteredTests} />
            ) : (
              <p className="rounded-card border border-aqua-deep/10 bg-white p-4 text-sm text-aqua-deep/75">
                Im gewählten Zeitraum sind keine auswertbaren Wasserwerte vorhanden.
              </p>
            )}

            <p className="text-xs text-aqua-deep/55">
              Die Grafiken dienen nur der Orientierung und ersetzen keine Diagnose.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-aqua-deep">Messwert-Historie</h3>
            <ul className="space-y-3">
              {waterTests.map((test) => (
                <li key={test.id}>
                  <WaterValueHistoryCard tankId={tankId} test={test} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

function SectionHeader({ diagnoseHref }: { diagnoseHref: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 id="wasserwerte-heading" className="text-lg font-semibold text-aqua-deep">
        Wasserwerte
      </h2>
      <Link
        href={diagnoseHref}
        className="inline-flex shrink-0 items-center justify-center rounded-button bg-aqua-blue px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#168EAA] sm:w-auto"
      >
        Neue Analyse starten
      </Link>
    </div>
  );
}

function EmptyHistoryState({ diagnoseHref }: { diagnoseHref: string }) {
  return (
    <div className="rounded-card border border-aqua-deep/10 bg-aqua-soft/60 p-4 text-sm text-aqua-deep/85">
      <p>
        Noch keine Messwerte vorhanden. Erfasse deine ersten Wasserwerte, um Trends zu
        erkennen.
      </p>
      <Link
        href={diagnoseHref}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-button bg-aqua-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#168EAA]"
      >
        Neue Analyse starten
      </Link>
    </div>
  );
}

function ChartsRow({
  chartMetrics,
  filteredTests,
}: {
  chartMetrics: WaterChartMetric[];
  filteredTests: WaterTest[];
}) {
  return (
    <div
      className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory"
      aria-label="Wasserwert-Verläufe"
    >
      {chartMetrics.map((metric) => (
        <div key={metric.key} className="snap-start">
          <WaterValueChart
            title={metric.label}
            unit={metric.unit}
            points={chartPointsForMetric(filteredTests, metric.key)}
          />
        </div>
      ))}
    </div>
  );
}
