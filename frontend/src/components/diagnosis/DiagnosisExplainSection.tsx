import type { DiagnosisItem } from "@/lib/types";
import { symptomLabelDE } from "@/lib/symptom-labels";

function formatScorePct(x: number): string {
  return `${Math.round(Math.min(1, Math.max(0, x)) * 100)} %`;
}

export function DiagnosisExplainSection({ diagnosis }: { diagnosis: DiagnosisItem }) {
  const cond = diagnosis.matched_conditions?.filter((s) => s.trim()) ?? [];
  const syms = diagnosis.matched_symptoms?.filter((s) => s.trim()) ?? [];
  const waters = diagnosis.matched_water_values ?? [];
  const sb = diagnosis.score_breakdown;

  if (cond.length === 0 && syms.length === 0 && waters.length === 0 && !sb) {
    return null;
  }

  return (
    <section
      className="rounded-card bg-aqua-soft/40 p-4 ring-1 ring-aqua-deep/10"
      aria-label="Warum diese Diagnose"
    >
      <h3 className="text-sm font-semibold text-aqua-deep">Warum diese Diagnose?</h3>
      <p className="mt-1 text-xs leading-relaxed text-aqua-deep/65">
        Die folgenden Punkte kommen deterministisch aus der Regelengine — ohne KI.
      </p>

      {cond.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
            Zusammenhang
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-aqua-deep/85">
            {cond.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {syms.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
            Gemeldete Symptome (relevant)
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {syms.map((s) => (
              <li
                key={s}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-aqua-deep ring-1 ring-aqua-deep/12"
              >
                {symptomLabelDE(s)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {waters.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
            Gemessene Wasserwerte (relevant)
          </p>
          <ul className="mt-2 space-y-2">
            {waters.map((w) => (
              <li
                key={w.field}
                className="rounded-lg bg-white px-3 py-2 text-sm text-aqua-deep ring-1 ring-aqua-deep/10"
              >
                <span className="font-medium">{w.label_de}</span>
                <span className="tabular-nums text-aqua-deep/85">
                  {": "}
                  {w.value}
                  {w.unit ? ` ${w.unit}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sb ? (
        <details className="mt-4 rounded-lg bg-white/80 p-3 ring-1 ring-aqua-deep/10">
          <summary className="cursor-pointer text-xs font-semibold text-aqua-deep">
            Konfidenz-Aufschlüsselung
          </summary>
          <dl className="mt-3 space-y-2 text-xs text-aqua-deep/85">
            <div className="flex justify-between gap-3">
              <dt>Basis (Regelwerk)</dt>
              <dd className="tabular-nums">{formatScorePct(sb.base)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Symptom-Zuschläge (gedeckelt)</dt>
              <dd className="tabular-nums">{formatScorePct(sb.symptom_subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Wasser-Zuschläge (gedeckelt)</dt>
              <dd className="tabular-nums">{formatScorePct(sb.water_subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-aqua-deep/10 pt-2 font-semibold text-aqua-deep">
              <dt>Endergebnis</dt>
              <dd className="tabular-nums">{formatScorePct(sb.capped_total)}</dd>
            </div>
          </dl>
        </details>
      ) : null}
    </section>
  );
}
