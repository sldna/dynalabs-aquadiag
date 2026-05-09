import Link from "next/link";

import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDateDE } from "@/lib/date";
import type { Tank } from "@/lib/types";

export type TankCardProps = {
  tank: Tank;
  /** ISO timestamp of latest measurement; pass undefined when none. */
  lastMeasurementAt?: string | null;
};

export function TankCard({ tank, lastMeasurementAt }: TankCardProps) {
  const lastDate = formatDateDE(lastMeasurementAt ?? tank.last_water_test_at);
  const hasDiagnosis =
    typeof tank.latest_diagnosis_type === "string" &&
    tank.latest_diagnosis_type.trim() !== "";
  const confidence =
    typeof tank.latest_diagnosis_confidence === "number" &&
    Number.isFinite(tank.latest_diagnosis_confidence)
      ? `${(tank.latest_diagnosis_confidence * 100).toFixed(0)}%`
      : null;

  return (
    <Link
      href={`/dashboard/tanks/${tank.id}`}
      className="block rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card transition-colors hover:border-aqua-blue/45 focus:outline-none focus:ring-2 focus:ring-aqua-blue/35"
      aria-label={`Becken ${tank.name} öffnen`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-aqua-deep">
            {tank.name}
          </h3>
          <p className="mt-1 text-sm text-aqua-deep/75">
            {tank.volume_liters} l
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-aqua-soft px-2.5 py-0.5 text-xs font-medium text-aqua-deep/70">
          ID {tank.id}
        </span>
      </div>
      {lastDate ? (
        <p className="mt-3 text-xs text-aqua-deep/55">
          Letzte Messung: <span className="text-aqua-deep/85">{lastDate}</span>
        </p>
      ) : (
        <p className="mt-3 text-xs text-aqua-deep/45">
          Noch keine Messungen
        </p>
      )}
      {hasDiagnosis ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-aqua-deep/60">
          {tank.latest_diagnosis_severity ? (
            <SeverityBadge severity={tank.latest_diagnosis_severity} />
          ) : null}
          <span>
            Letzte Diagnose:{" "}
            <span className="font-medium text-aqua-deep/85">
              {tank.latest_diagnosis_type}
            </span>
          </span>
          {confidence ? <span>Konfidenz {confidence}</span> : null}
        </div>
      ) : null}
    </Link>
  );
}
