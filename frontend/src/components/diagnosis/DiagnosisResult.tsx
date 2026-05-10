import type {
  DiagnoseAPIResponse,
  DiagnosisContext,
  DiagnosisItem,
} from "@/lib/types";
import { Card } from "@/components/layout";
import { ActionList } from "@/components/diagnosis/ActionList";
import { AvoidList } from "@/components/diagnosis/AvoidList";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { FollowUpQuestions } from "@/components/diagnosis/FollowUpQuestions";
import { HeroDiagnosisCard } from "@/components/diagnosis/HeroDiagnosisCard";
import { formatDateTimeDE } from "@/lib/date";

function pickTop(result: DiagnoseAPIResponse): DiagnosisItem | null {
  if ("top_diagnosis" in result && result.top_diagnosis) return result.top_diagnosis;
  const diagnoses = "diagnoses" in result ? result.diagnoses ?? [] : [];
  return diagnoses[0] ?? null;
}

function withoutTop(all: DiagnosisItem[], top: DiagnosisItem | null) {
  if (!top) return all;
  return all.filter((d) => d.rule_id !== top.rule_id);
}

const CONTEXT_LABELS: Record<string, string> = {
  tank_age_days: "Becken-Alter (Tage)",
  recent_water_change: "Kürzlich Wasser gewechselt",
  recent_filter_cleaning: "Filter kürzlich gereinigt",
  co2_enabled: "CO₂-Zufuhr aktiv",
  high_stocking_density: "Hohe Besatzdichte",
  heavy_feeding: "Kräftige Fütterung",
  many_dead_plants: "Viele abgestorbene Pflanzen",
  new_animals_recently: "Kürzlich neue Tiere",
};

function formatContextValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "Ja" : "Nein";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v);
}

export function ConsideredContextSection({
  context,
}: {
  context: DiagnosisContext;
}) {
  const rows = (
    Object.entries(context) as [string, unknown][]
  ).filter(([, v]) => v !== undefined && v !== null);
  if (rows.length === 0) return null;

  return (
    <Card as="section" aria-label="Berücksichtigter Kontext">
      <h3 className="text-sm font-semibold text-aqua-deep">
        Berücksichtigter Kontext
      </h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([key, val]) => (
          <div
            key={key}
            className="rounded-lg bg-aqua-soft/50 px-3 py-2 ring-1 ring-aqua-deep/10"
          >
            <dt className="text-xs font-medium text-aqua-deep/75">
              {CONTEXT_LABELS[key] ?? key}
            </dt>
            <dd className="mt-0.5 font-medium text-aqua-deep">
              {formatContextValue(val)}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Zeitstempel und Persistenz-IDs vor Hero/Kontext (020 Diagnosis Result Layout). */
export function DiagnosisRunMetaStrip({ result }: { result: DiagnoseAPIResponse }) {
  if (!("meta" in result) || !result.meta) return null;
  const m = result.meta;
  const ts = formatDateTimeDE(m.generated_at);
  const iso = m.generated_at?.trim();

  return (
    <Card
      as="section"
      aria-label="Messkontext und Zeitstempel"
      className="border-aqua-deep/15 bg-aqua-soft/50"
    >
      <p className="text-xs leading-relaxed text-aqua-deep/85">
        {ts && iso ? (
          <>
            Stand:{" "}
            <time dateTime={iso}>{ts}</time>
          </>
        ) : null}
        {ts ? <span aria-hidden="true"> · </span> : null}
        <span>Becken-ID {m.tank_id}</span>
        <span aria-hidden="true"> · </span>
        <span>Diagnose-ID {m.diagnosis_id}</span>
      </p>
    </Card>
  );
}

/** Single primary action; sticky at viewport bottom on small screens, inline after content on md+. */
function BottomNewAnalysisBar({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-aqua-deep/10 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(8,47,58,0.06)] md:static md:z-auto md:mx-0 md:mt-2 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:shadow-none">
      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA]"
      >
        Neue Analyse
      </button>
    </div>
  );
}

export function DiagnosisResultLoading() {
  return (
    <div className="space-y-4">
      <div className="rounded-card bg-aqua-soft p-4 ring-1 ring-aqua-deep/10">
        <div className="h-4 w-28 rounded bg-aqua-deep/15" />
        <div className="mt-3 h-8 w-4/5 max-w-full rounded bg-aqua-deep/15 sm:max-w-xl" />
        <div className="mt-4 h-20 rounded bg-aqua-deep/10" />
      </div>
      <div className="rounded-card bg-aqua-soft p-4 ring-1 ring-aqua-deep/10">
        <div className="h-4 w-24 rounded bg-aqua-deep/15" />
        <div className="mt-3 h-16 rounded bg-aqua-deep/10" />
      </div>
    </div>
  );
}

export function DiagnosisResultEmpty() {
  return (
    <div className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card">
      <p className="text-sm text-aqua-deep/85">
        Noch keine Diagnose. Starte oben eine Diagnose, dann erscheinen hier die
        nächsten Schritte.
      </p>
    </div>
  );
}

export function DiagnosisResultUnknown({
  result,
  onRetry,
}: {
  result?: DiagnoseAPIResponse;
  onRetry?: () => void;
}) {
  const ctx =
    result &&
    "considered_context" in result &&
    result.considered_context &&
    Object.keys(result.considered_context).length > 0
      ? result.considered_context
      : null;

  const metaStrip =
    result && "meta" in result && result.meta ? (
      <div className="mb-4">
        <DiagnosisRunMetaStrip result={result} />
      </div>
    ) : null;

  return (
    <>
      {metaStrip}
      {ctx ? (
        <div className="mb-4">
          <ConsideredContextSection context={ctx} />
        </div>
      ) : null}
      <section
        className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
        aria-label="Unbekannter Diagnose-Status"
      >
        <h2 className="text-base font-semibold tracking-tight text-aqua-deep">
          Keine eindeutige Diagnose möglich
        </h2>
        <p className="mt-2 text-sm text-aqua-deep/85">
          Mit den aktuellen Angaben lässt sich keine zuverlässige Zuordnung treffen.
          Das ist häufig ein Hinweis darauf, dass Messwerte oder Symptome fehlen –
          nicht unbedingt, dass etwas „dramatisch“ ist.
        </p>

        <div className="mt-4 space-y-3">
          <section className="rounded-card bg-aqua-soft p-4 ring-1 ring-aqua-deep/10">
            <h3 className="text-sm font-semibold text-aqua-deep">
              Bitte weitere Werte prüfen
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-aqua-deep/85">
              <li>Nitrit messen (NO₂)</li>
              <li>pH messen</li>
            </ul>
          </section>

          <section className="rounded-card bg-aqua-soft p-4 ring-1 ring-aqua-deep/10">
            <h3 className="text-sm font-semibold text-aqua-deep">
              Möglicherweise fehlen Angaben
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-aqua-deep/85">
              <li>Fischverhalten beschreiben (Atmung, Fressen, Schwimmen)</li>
              <li>Weitere Symptome ergänzen (du kannst später mehr hinzufügen)</li>
            </ul>
          </section>
        </div>
      </section>
      {onRetry ? <BottomNewAnalysisBar onRetry={onRetry} /> : null}
    </>
  );
}

export function DiagnosisResult({
  result,
  onRetry,
}: {
  result: DiagnoseAPIResponse;
  onRetry?: () => void;
}) {
  if (result.status === "unknown") {
    return <DiagnosisResultUnknown result={result} onRetry={onRetry} />;
  }

  const diagnoses = result.diagnoses ?? [];
  if (diagnoses.length === 0) {
    return <DiagnosisResultUnknown result={result} onRetry={onRetry} />;
  }

  const top = pickTop(result);
  if (!top) return <DiagnosisResultUnknown result={result} onRetry={onRetry} />;

  const additional = withoutTop(diagnoses, top);
  const aiExplanation = "ai_explanation" in result ? result.ai_explanation : null;
  const considered =
    "considered_context" in result && result.considered_context
      ? result.considered_context
      : null;

  const safetyBlock =
    top.safety_note_de?.trim() ? (
      <Card
        as="section"
        aria-label="Sicherheitshinweis"
        className="border-status-warning/40 bg-status-warning/15 ring-status-warning/35"
      >
        <h3 className="text-sm font-semibold text-aqua-deep">Hinweis</h3>
        <p className="mt-2 text-sm text-aqua-deep/90">{top.safety_note_de}</p>
      </Card>
    ) : null;

  return (
    <>
      <div className="space-y-5">
        <DiagnosisRunMetaStrip result={result} />

        {considered && Object.keys(considered).length > 0 ? (
          <ConsideredContextSection context={considered} />
        ) : null}

        <HeroDiagnosisCard diagnosis={top} />

        <section
          className="rounded-card bg-white p-4 shadow-card ring-1 ring-aqua-deep/10"
          aria-label="Empfohlene Maßnahmen"
        >
          <div className="space-y-4">
            <ActionList title="Jetzt tun" items={top.actions_now} tone="primary" />
            <ActionList title="Optional" items={top.actions_optional} tone="neutral" />
            <AvoidList items={top.avoid} />

            <details className="rounded-card bg-aqua-soft p-4 ring-1 ring-aqua-deep/10">
              <summary className="cursor-pointer text-sm font-semibold text-aqua-deep">
                Erklärung
              </summary>
              {top.summary_de?.trim() ? (
                <p className="mt-3 text-sm text-aqua-deep/85">{top.summary_de}</p>
              ) : null}
              {top.reasoning_de?.trim() ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-aqua-deep/85">
                  {top.reasoning_de}
                </p>
              ) : null}
            </details>

            <FollowUpQuestions questions={top.follow_up_questions_de} />
          </div>
        </section>

        {additional.length > 0 ? (
          <section className="space-y-3" aria-label="Weitere mögliche Ursachen">
            <h3 className="text-sm font-semibold text-aqua-deep">
              Weitere mögliche Ursachen
            </h3>
            <div className="space-y-3">
              {additional.map((d) => (
                <DiagnosisCard key={d.rule_id} diagnosis={d} emphasis="extra">
                  <ActionList title="Jetzt tun" items={d.actions_now} tone="neutral" />
                  <ActionList
                    title="Optional"
                    items={d.actions_optional}
                    tone="neutral"
                  />
                  <AvoidList items={d.avoid} />
                </DiagnosisCard>
              ))}
            </div>
          </section>
        ) : null}

        {aiExplanation ? (
          <details className="rounded-card bg-aqua-soft/90 p-4 ring-1 ring-aqua-deep/15">
            <summary className="cursor-pointer text-sm font-semibold text-aqua-deep">
              AI-Erklärung (optional)
            </summary>
            <div className="mt-3 space-y-3 border-t border-aqua-deep/10 pt-3">
              <p className="text-xs leading-relaxed text-aqua-deep/60">
                Die KI ergänzt die regelbasierte Analyse, ersetzt sie aber nicht.
              </p>

              {aiExplanation.summary?.trim() ? (
                <p className="text-sm text-aqua-deep/85">{aiExplanation.summary}</p>
              ) : null}
              {aiExplanation.reasoning_public?.trim() ? (
                <p className="whitespace-pre-wrap text-sm text-aqua-deep/85">
                  {aiExplanation.reasoning_public}
                </p>
              ) : null}
              {aiExplanation.safety_note?.trim() ? (
                <p className="text-sm text-aqua-deep/85">
                  <span className="font-semibold">Hinweis:</span>{" "}
                  {aiExplanation.safety_note}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}

        {safetyBlock}
      </div>
      {onRetry ? <BottomNewAnalysisBar onRetry={onRetry} /> : null}
    </>
  );
}
