import type { DiagnoseAPIResponse, DiagnosisItem } from "@/lib/types";
import { ActionList } from "@/components/diagnosis/ActionList";
import { AvoidList } from "@/components/diagnosis/AvoidList";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { FollowUpQuestions } from "@/components/diagnosis/FollowUpQuestions";

function pickTop(result: DiagnoseAPIResponse): DiagnosisItem | null {
  if ("top_diagnosis" in result && result.top_diagnosis) return result.top_diagnosis;
  const diagnoses = "diagnoses" in result ? result.diagnoses ?? [] : [];
  return diagnoses[0] ?? null;
}

function withoutTop(all: DiagnosisItem[], top: DiagnosisItem | null) {
  if (!top) return all;
  return all.filter((d) => d.rule_id !== top.rule_id);
}

export function DiagnosisResultLoading() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse rounded-card bg-aqua-soft p-4">
        <div className="h-4 w-28 rounded bg-aqua-deep/15" />
        <div className="mt-3 h-6 w-3/4 rounded bg-aqua-deep/15" />
        <div className="mt-4 h-24 rounded bg-aqua-deep/10" />
      </div>
      <div className="animate-pulse rounded-card bg-aqua-soft p-4">
        <div className="h-4 w-24 rounded bg-aqua-deep/15" />
        <div className="mt-3 h-20 rounded bg-aqua-deep/10" />
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

export function DiagnosisResultUnknown({ onRetry }: { onRetry?: () => void }) {
  return (
    <section
      className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
      aria-label="Unbekannter Diagnose-Status"
    >
      <h2 className="text-base font-semibold tracking-tight text-aqua-deep">
        Keine eindeutige Diagnose möglich
      </h2>
      <p className="mt-2 text-sm text-aqua-deep/85">
        Mit den aktuellen Angaben lässt sich keine zuverlässige Zuordnung treffen.
        Das ist häufig ein Hinweis darauf, dass Messwerte oder Symptome fehlen – nicht
        unbedingt, dass etwas „dramatisch“ ist.
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

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 w-full rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA]"
        >
          Neue Analyse
        </button>
      ) : null}
    </section>
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
    return <DiagnosisResultUnknown onRetry={onRetry} />;
  }

  const diagnoses = result.diagnoses ?? [];
  if (diagnoses.length === 0) return <DiagnosisResultUnknown onRetry={onRetry} />;

  const top = pickTop(result);
  if (!top) return <DiagnosisResultUnknown onRetry={onRetry} />;

  const additional = withoutTop(diagnoses, top);

  return (
    <div className="space-y-6">
      {/* A. Top diagnosis */}
      <DiagnosisCard diagnosis={top} emphasis="top">
        {/* B. Jetzt tun */}
        <ActionList title="Jetzt tun" items={top.actions_now} tone="primary" />

        {/* C. Optional */}
        <ActionList title="Optional" items={top.actions_optional} tone="neutral" />

        {/* D. Nicht tun */}
        <AvoidList items={top.avoid} />

        {/* F. Expandable explanation */}
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

        {/* G. Follow-up questions */}
        <FollowUpQuestions questions={top.follow_up_questions_de} />

        {/* H. Safety note */}
        {top.safety_note_de?.trim() ? (
          <section className="rounded-card bg-status-warning/15 p-4 ring-1 ring-status-warning/35">
            <h3 className="text-sm font-semibold text-aqua-deep">Hinweis</h3>
            <p className="mt-2 text-sm text-aqua-deep/90">{top.safety_note_de}</p>
          </section>
        ) : null}
      </DiagnosisCard>

      {/* E. Additional diagnoses */}
      {additional.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-aqua-deep">
            Weitere Diagnosen ({additional.length})
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
    </div>
  );
}
