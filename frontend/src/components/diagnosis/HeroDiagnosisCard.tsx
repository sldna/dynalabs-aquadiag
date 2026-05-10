import type { DiagnosisItem } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { diagnosisDisplayName } from "@/components/diagnosis/diagnosis-display-name";
import { diagnosisCategoryLabelDE } from "@/lib/diagnosis-category";
import { severityHeroAccent, severityLabelDE } from "@/lib/severity";

function heroSummary(d: DiagnosisItem): string | null {
  const s = d.summary_de?.trim();
  if (s) return s;
  const r = d.reasoning_de?.trim();
  if (!r) return null;
  const max = 320;
  if (r.length <= max) return r;
  return `${r.slice(0, max).trim()}…`;
}

export function HeroDiagnosisCard({ diagnosis }: { diagnosis: DiagnosisItem }) {
  const { wrap } = severityHeroAccent(diagnosis.severity);
  const conf = diagnosis.confidence;
  const pct =
    typeof conf === "number" && Number.isFinite(conf)
      ? Math.round(Math.min(1, Math.max(0, conf)) * 100)
      : null;
  const summary = heroSummary(diagnosis);
  const cat = diagnosisCategoryLabelDE(diagnosis.category);

  return (
    <article
      className={`rounded-card px-5 py-5 pl-6 shadow-card ring-1 ring-aqua-deep/12 ${wrap}`}
      aria-label="Hauptdiagnose"
    >
      <h2 className="text-xl font-semibold tracking-tight text-aqua-deep sm:text-2xl">
        {diagnosisDisplayName(diagnosis)}
      </h2>

      {cat ? (
        <p className="mt-2 inline-flex rounded-full bg-aqua-soft px-3 py-1 text-xs font-medium text-aqua-deep ring-1 ring-aqua-blue/25">
          {cat}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SeverityBadge
          severity={diagnosis.severity}
          label={severityLabelDE(String(diagnosis.severity))}
          size="lg"
        />
        {pct !== null ? (
          <span className="text-base font-semibold tabular-nums text-aqua-deep">
            Konfidenz {pct}%
          </span>
        ) : null}
      </div>

      {diagnosis.rule_id?.trim() ? (
        <p className="mt-2 text-xs text-aqua-deep/50">{diagnosis.rule_id.trim()}</p>
      ) : null}

      {summary ? (
        <p className="mt-4 text-sm leading-relaxed text-aqua-deep/90">{summary}</p>
      ) : (
        <p className="mt-4 text-sm text-aqua-deep/65">
          Ausführliche Einordnung findest du unter „Erklärung“.
        </p>
      )}

      {diagnosis.uncertainty_note_de?.trim() ? (
        <p className="mt-4 rounded-lg border border-status-warning/40 bg-status-warning/10 px-3 py-2 text-sm text-aqua-deep/90">
          {diagnosis.uncertainty_note_de.trim()}
        </p>
      ) : null}
    </article>
  );
}
