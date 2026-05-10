import type { DiagnoseAPIResponse, DiagnosisItem } from "@/lib/types";
import { ActionList } from "@/components/diagnosis/ActionList";
import { AvoidList } from "@/components/diagnosis/AvoidList";
import { DiagnosisCard } from "@/components/diagnosis/DiagnosisCard";
import { FollowUpAnswersSection } from "@/components/diagnosis/FollowUpAnswersSection";
import { HeroDiagnosisCard } from "@/components/diagnosis/HeroDiagnosisCard";

function pickTop(result: DiagnoseAPIResponse): DiagnosisItem | null {
  if ("top_diagnosis" in result && result.top_diagnosis) return result.top_diagnosis;
  const diagnoses = "diagnoses" in result ? result.diagnoses ?? [] : [];
  return diagnoses[0] ?? null;
}

function withoutTop(all: DiagnosisItem[], top: DiagnosisItem | null) {
  if (!top) return all;
  return all.filter((d) => d.rule_id !== top.rule_id);
}

export function formatDiagnosisTimestamp(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return null;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
}

function ResultContextHeader({
  tankSummaryLine,
  generatedAtLabel,
  diagnosisMetaLine,
}: {
  tankSummaryLine: string | null;
  generatedAtLabel: string | null;
  diagnosisMetaLine?: string | null;
}) {
  if (!tankSummaryLine && !generatedAtLabel && !diagnosisMetaLine) return null;
  return (
    <header className="rounded-card border border-aqua-deep/10 bg-aqua-soft/60 px-4 py-3 shadow-card ring-1 ring-aqua-deep/10">
      {tankSummaryLine ? (
        <p className="text-sm text-aqua-deep">
          Analyse für:{" "}
          <span className="font-semibold text-aqua-deep">{tankSummaryLine}</span>
        </p>
      ) : null}
      {generatedAtLabel ? (
        <p className="mt-1 text-xs text-aqua-deep/70">Stand: {generatedAtLabel}</p>
      ) : null}
      {diagnosisMetaLine ? (
        <p className="mt-2 text-xs text-aqua-deep/55">{diagnosisMetaLine}</p>
      ) : null}
    </header>
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
        <div className="mt-3 h-8 w-4/5 max-w-md rounded bg-aqua-deep/15" />
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
  onRetry,
  tankSummaryLine,
  generatedAtLabel,
  diagnosisMetaLine,
}: {
  onRetry?: () => void;
  tankSummaryLine?: string | null;
  generatedAtLabel?: string | null;
  diagnosisMetaLine?: string | null;
}) {
  return (
    <>
      <ResultContextHeader
        tankSummaryLine={tankSummaryLine ?? null}
        generatedAtLabel={generatedAtLabel ?? null}
        diagnosisMetaLine={diagnosisMetaLine ?? null}
      />
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
  tankSummaryLine,
  saveFollowUpAnswers,
  onReanalyzeWithFollowUps,
  reanalysisBusy = false,
  reanalysisUpdatedNote = false,
}: {
  result: DiagnoseAPIResponse;
  onRetry?: () => void;
  tankSummaryLine: string | null;
  saveFollowUpAnswers: (answers: Record<string, string>) => Promise<void>;
  onReanalyzeWithFollowUps: (answers: Record<string, string>) => Promise<void>;
  reanalysisBusy?: boolean;
  reanalysisUpdatedNote?: boolean;
}) {
  const meta = "meta" in result && result.meta ? result.meta : undefined;
  const generatedAtLabel = formatDiagnosisTimestamp(meta?.generated_at);
  const diagnosisMetaLine =
    meta?.diagnosis_id != null && meta?.tank_id != null
      ? `Diagnose-ID ${meta.diagnosis_id} · Becken-ID ${meta.tank_id}`
      : null;

  if (result.status === "unknown") {
    return (
      <DiagnosisResultUnknown
        onRetry={onRetry}
        tankSummaryLine={tankSummaryLine}
        generatedAtLabel={generatedAtLabel}
        diagnosisMetaLine={diagnosisMetaLine}
      />
    );
  }

  const diagnoses = result.diagnoses ?? [];
  if (diagnoses.length === 0) {
    return (
      <DiagnosisResultUnknown
        onRetry={onRetry}
        tankSummaryLine={tankSummaryLine}
        generatedAtLabel={generatedAtLabel}
        diagnosisMetaLine={diagnosisMetaLine}
      />
    );
  }

  const top = pickTop(result);
  if (!top) {
    return (
      <DiagnosisResultUnknown
        onRetry={onRetry}
        tankSummaryLine={tankSummaryLine}
        generatedAtLabel={generatedAtLabel}
        diagnosisMetaLine={diagnosisMetaLine}
      />
    );
  }

  const additional = withoutTop(diagnoses, top);
  const aiExplanation = "ai_explanation" in result ? result.ai_explanation : null;

  return (
    <>
      <div className="mx-auto w-full space-y-5">
        <ResultContextHeader
          tankSummaryLine={tankSummaryLine}
          generatedAtLabel={generatedAtLabel}
          diagnosisMetaLine={diagnosisMetaLine}
        />

        {reanalysisUpdatedNote ? (
          <p
            role="status"
            className="rounded-lg border border-status-success/45 bg-status-success/15 px-4 py-3 text-sm font-medium text-aqua-deep"
          >
            Die Analyse wurde mit deinen Antworten aktualisiert.
          </p>
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

            {top.safety_note_de?.trim() ? (
              <section className="rounded-card bg-status-warning/15 p-4 ring-1 ring-status-warning/35">
                <h3 className="text-sm font-semibold text-aqua-deep">Hinweis</h3>
                <p className="mt-2 text-sm text-aqua-deep/90">{top.safety_note_de}</p>
              </section>
            ) : null}

            <details className="rounded-card bg-aqua-soft p-4 ring-1 ring-aqua-deep/10">
              <summary className="cursor-pointer text-sm font-semibold text-aqua-deep">
                Erklärung (regelbasiert)
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

        <FollowUpAnswersSection
          questions={top.follow_up_questions_de}
          diagnosisId={meta?.diagnosis_id}
          initialAnswers={result.follow_up_answers}
          onPersistAnswers={saveFollowUpAnswers}
          onReanalyzeWithFollowUps={onReanalyzeWithFollowUps}
          reanalysisBusy={reanalysisBusy}
        />

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
      </div>
      {onRetry ? <BottomNewAnalysisBar onRetry={onRetry} /> : null}
    </>
  );
}
