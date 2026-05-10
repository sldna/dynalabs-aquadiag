import type { DiagnosisItem } from "@/lib/types";
import { SeverityBadge } from "@/components/SeverityBadge";
import { diagnosisDisplayName } from "@/components/diagnosis/diagnosis-display-name";
import { severityHeroAccent } from "@/lib/severity";

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

  return (
    <article
      className={`rounded-card px-5 py-5 pl-6 shadow-card ring-1 ring-aqua-deep/12 ${wrap}`}
      aria-label="Hauptdiagnose"
    >
      <div className="flex flex-wrap items-center gap-3">
        <SeverityBadge severity={diagnosis.severity} size="lg" />
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-tight text-aqua-deep sm:text-2xl">
        {diagnosisDisplayName(diagnosis)}
      </h2>

      {pct !== null ? (
        <p className="mt-2 text-base font-semibold tabular-nums text-aqua-deep">
          Konfidenz {pct}%
        </p>
      ) : null}

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
    </article>
  );
}
