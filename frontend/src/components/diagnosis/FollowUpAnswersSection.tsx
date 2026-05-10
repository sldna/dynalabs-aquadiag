"use client";

import { useEffect, useState } from "react";

export type FollowUpAnswersSectionProps = {
  questions: string[];
  diagnosisId?: number;
  initialAnswers?: Record<string, string>;
  onPersistAnswers: (answers: Record<string, string>) => Promise<void>;
  onNewAnalysisWithAnswers?: (answers: Record<string, string>) => void;
};

export function FollowUpAnswersSection({
  questions,
  diagnosisId,
  initialAnswers,
  onPersistAnswers,
  onNewAnalysisWithAnswers,
}: FollowUpAnswersSectionProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    ...(initialAnswers ?? {}),
  }));
  const [busy, setBusy] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft({ ...(initialAnswers ?? {}) });
    setSavedPulse(false);
    setError(null);
  }, [diagnosisId, initialAnswers, questions]);

  if (questions.length === 0) return null;

  async function save() {
    setError(null);
    setBusy(true);
    setSavedPulse(false);
    try {
      await onPersistAnswers({ ...draft });
      setSavedPulse(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  const baseId =
    diagnosisId !== undefined ? `fu-${diagnosisId}` : "fu-local";

  return (
    <section
      className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
      aria-label="Rückfragen beantworten"
    >
      <h3 className="text-sm font-semibold text-aqua-deep">Rückfragen</h3>
      <p className="mt-2 text-sm leading-relaxed text-aqua-deep/80">
        Diese Antworten verbessern spätere Auswertungen, lösen aber noch keine
        automatische Neuberechnung aus.
      </p>

      <div className="mt-4 space-y-5">
        {questions.map((q, i) => {
          const key = String(i);
          const inputId = `${baseId}-q-${key}`;
          return (
            <div key={key} className="space-y-2">
              <label
                htmlFor={inputId}
                className="block text-sm font-medium text-aqua-deep"
              >
                {q}
              </label>
              <textarea
                id={inputId}
                name={`follow_up_${key}`}
                rows={3}
                disabled={busy}
                value={draft[key] ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="min-h-[3rem] w-full rounded-lg border border-aqua-deep/20 px-3 py-3 text-base text-aqua-deep placeholder:text-aqua-deep/40 disabled:opacity-60 md:text-sm"
                placeholder="Deine Antwort (optional)"
              />
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-button bg-aqua-deep px-4 py-3 text-sm font-semibold text-white hover:bg-aqua-deep/90 disabled:opacity-60"
        >
          {busy ? "Speichern…" : "Antworten speichern"}
        </button>
        {onNewAnalysisWithAnswers ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onNewAnalysisWithAnswers({ ...draft })}
            className="rounded-button border-2 border-aqua-blue bg-white px-4 py-3 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft disabled:opacity-60"
          >
            Neue Analyse mit Antworten starten
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {savedPulse ? "Die Nachfragen-Antworten wurden gespeichert." : ""}
      </p>
      {savedPulse ? (
        <p
          className="mt-3 text-sm font-medium text-status-success"
          data-testid="follow-ups-saved"
        >
          Antworten gespeichert.
        </p>
      ) : null}
    </section>
  );
}
