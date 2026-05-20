"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useWaterTestConfig } from "@/hooks/useWaterTestConfig";
import { useWaterTestTimers } from "@/hooks/useWaterTestTimers";
import { browserApiBase } from "@/lib/api-base";
import {
  type ThresholdEvaluation,
  type TimerId,
  type WaterTestProfile,
  type WaterTestTimerGroup,
  evaluateThreshold,
  thresholdToWaterQualityStatus,
  timerGroupsForField,
  timerGroupsWithoutField,
  waterTestTimerId,
} from "@/lib/water-test-config";
import type { TimerView } from "@/lib/water-test-timer-runtime";
import { requestNotificationPermission } from "@/lib/water-test-timer-runtime";
import { waterQualityLabelDE } from "@/lib/water-quality";

type QuickWaterTestFormProps = {
  tankId: number;
  tankName: string;
};

type ParsedNumber = { value?: number; error?: string };

const STANDBY_HINT =
  "Hinweis: Bei gesperrtem Smartphone kann die Benachrichtigung je nach Gerät eingeschränkt sein. Beim Zurückkehren zeigt AquaDiag abgelaufene Timer korrekt an.";

function parseNonNegativeNumber(input: string): ParsedNumber {
  const t = input.trim();
  if (!t) return {};
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return { error: "Bitte eine gültige Zahl eingeben." };
  if (n < 0) return { error: "Wert darf nicht negativ sein." };
  return { value: n };
}

function mmss(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function notificationHint(): string | null {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "Browser-Benachrichtigungen sind nicht verfügbar. Timer warnen nur innerhalb der geöffneten App.";
  }
  if (Notification.permission === "denied") {
    return "Benachrichtigungen sind blockiert. Timer warnen nur innerhalb der geöffneten App (Ton und Anzeige).";
  }
  if (Notification.permission === "default") {
    return "Optional: Erlaube Browser-Benachrichtigungen für Timer-Hinweise auch im Hintergrund.";
  }
  return null;
}

export function QuickWaterTestForm({ tankId, tankName }: QuickWaterTestFormProps) {
  const configState = useWaterTestConfig();
  const timerGroups = configState.status === "ready" ? configState.timerGroups : null;
  const { views, startTimer, pauseTimer, resetTimer } = useWaterTestTimers(tankId, timerGroups);

  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTestId, setSavedTestId] = useState<number | null>(null);
  const [notifHintDismissed, setNotifHintDismissed] = useState(false);

  const config = configState.status === "ready" ? configState.config : null;

  const validation = useMemo(() => {
    if (!config) return {};
    const out: Record<string, ParsedNumber> = {};
    for (const test of config.tests) {
      if (test.input_type === "select") continue;
      out[test.key] = parseNonNegativeNumber(values[test.key] ?? "");
    }
    return out;
  }, [config, values]);

  const hasValidationErrors = Object.values(validation).some((v) => Boolean(v.error));

  const standaloneTimerGroups = useMemo(
    () => (timerGroups ? timerGroupsWithoutField(timerGroups) : []),
    [timerGroups],
  );

  const notifHint = useMemo(() => notificationHint(), []);

  function setValue(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!config) return;

    if (hasValidationErrors) {
      setError("Bitte korrigiere die markierten Eingaben.");
      return;
    }

    const payload: Record<string, number | string> = {};
    for (const test of config.tests) {
      const raw = values[test.key]?.trim();
      if (!raw) continue;
      const parsed = parseNonNegativeNumber(raw);
      if (parsed.value !== undefined) {
        payload[test.key] = parsed.value;
      }
    }
    const trimmedNotes = notes.trim();
    if (trimmedNotes) payload.notes = trimmedNotes;

    if (Object.keys(payload).filter((k) => k !== "notes").length === 0) {
      setError("Bitte mindestens einen Messwert eintragen.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${browserApiBase()}/v1/tanks/${tankId}/water-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const raw: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          raw && typeof raw === "object" && raw !== null && "message" in raw && typeof (raw as { message: unknown }).message === "string"
            ? (raw as { message: string }).message
            : `HTTP ${res.status}`;
        setError(msg);
        return;
      }
      const out = raw as { id?: number };
      setSavedTestId(typeof out.id === "number" ? out.id : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  if (configState.status === "loading") {
    return (
      <section className="rounded-card border border-aqua-deep/10 bg-white p-6 shadow-card">
        <p className="text-sm text-aqua-deep/75">Wassertest-Konfiguration wird geladen…</p>
      </section>
    );
  }

  if (configState.status === "error") {
    return (
      <section className="rounded-card border border-status-critical/30 bg-status-critical/5 p-6 shadow-card">
        <p role="alert" className="text-sm font-medium text-status-critical">
          {configState.message}
        </p>
        <p className="mt-2 text-xs text-aqua-deep/70">Bitte Backend-Verbindung prüfen und die Seite neu laden.</p>
      </section>
    );
  }

  if (configState.status === "empty" || !config) {
    return (
      <section className="rounded-card border border-aqua-deep/10 bg-white p-6 shadow-card">
        <p className="text-sm text-aqua-deep/75">Keine Wassertest-Konfiguration verfügbar.</p>
      </section>
    );
  }

  if (savedTestId !== null) {
    return (
      <section className="space-y-4 rounded-card border border-status-success/40 bg-status-success/10 p-4 shadow-card sm:p-5">
        <h2 className="text-lg font-semibold text-aqua-deep">Messung gespeichert</h2>
        <p className="text-sm text-aqua-deep/85">
          Die Wasserwerte für <strong>{tankName}</strong> wurden gespeichert und stehen in der Historie zur Verfügung.
        </p>
        <p className="text-xs text-aqua-deep/65">Messungs-ID: {savedTestId}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/dashboard/tanks/${tankId}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA]"
          >
            Zurück zum Becken
          </Link>
          <button
            type="button"
            disabled
            className="inline-flex min-h-[44px] items-center justify-center rounded-button border border-aqua-deep/20 bg-white px-4 py-3 text-sm font-semibold text-aqua-deep/60"
            title="Analyse aus gespeicherter Messung folgt im nächsten Schritt."
          >
            Analyse mit diesen Werten starten
          </button>
        </div>
        <p className="text-xs text-aqua-deep/70">
          Analyse aus gespeicherter Messung folgt im nächsten Schritt.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-aqua-blue/25 bg-aqua-soft/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-aqua-deep/60">Becken</p>
        <p className="mt-1 text-lg font-semibold text-aqua-deep">{tankName}</p>
        <p className="text-sm text-aqua-deep/75">Du kannst Werte einzeln erfassen – eine Diagnose ist nicht erforderlich.</p>
      </section>

      {notifHint && !notifHintDismissed ? (
        <section className="rounded-card border border-aqua-blue/20 bg-aqua-soft/50 p-4">
          <p className="text-xs text-aqua-deep/80">{notifHint}</p>
          {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" ? (
            <button
              type="button"
              onClick={() => requestNotificationPermission()}
              className="mt-2 min-h-[36px] rounded-button border border-aqua-blue bg-white px-3 py-1.5 text-xs font-semibold text-aqua-deep hover:bg-aqua-soft"
            >
              Benachrichtigungen erlauben
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setNotifHintDismissed(true)}
            className="mt-2 block text-xs text-aqua-deep/60 underline"
          >
            Hinweis ausblenden
          </button>
        </section>
      ) : null}

      <form id="quick-water-test-form" onSubmit={onSubmit} className="space-y-4 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card sm:p-5">
        {config.tests.map((test) => (
          <TestFieldCard
            key={test.key}
            test={test}
            value={values[test.key] ?? ""}
            onChange={(v) => setValue(test.key, v)}
            error={test.input_type === "select" ? undefined : validation[test.key]?.error}
            thresholds={config.thresholds}
            timerGroups={timerGroups ?? []}
            views={views}
            onStartTimer={startTimer}
            onPauseTimer={pauseTimer}
            onResetTimer={resetTimer}
          />
        ))}

        {standaloneTimerGroups.length > 0 ? (
          <TimerGroupsSection
            title="Weitere JBL-Wassertest-Timer"
            description="Timer für Tests ohne eigenes Eingabefeld – parallel zu den Messwert-Timern nutzbar."
            standbyHint={STANDBY_HINT}
            groups={standaloneTimerGroups}
            views={views}
            onStartTimer={startTimer}
            onPauseTimer={pauseTimer}
            onResetTimer={resetTimer}
          />
        ) : null}

        <section className="rounded-card border border-aqua-deep/10 bg-white p-4">
          <label className="block text-sm font-semibold text-aqua-deep">
            Notizen (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-aqua-deep/20 px-3 py-2.5 text-base text-aqua-deep md:text-sm"
              placeholder="z. B. vor dem Wasserwechsel gemessen"
            />
          </label>
        </section>

        {error ? (
          <p role="alert" className="text-sm font-medium text-status-critical">
            {error}
          </p>
        ) : null}

        <div className="hidden md:block">
          <button
            type="submit"
            disabled={busy || hasValidationErrors}
            className="w-full rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
          >
            {busy ? "Speichere…" : "Messung speichern"}
          </button>
        </div>
      </form>

      <div className="sticky bottom-0 z-10 border-t border-aqua-deep/10 bg-white pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
        <button
          type="submit"
          form="quick-water-test-form"
          disabled={busy || hasValidationErrors}
          className="w-full rounded-button bg-aqua-blue px-4 py-3.5 text-base font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
        >
          {busy ? "Speichere…" : "Messung speichern"}
        </button>
      </div>
    </div>
  );
}

type TimerHandlers = {
  views: Record<TimerId, TimerView>;
  onStartTimer: (timerId: TimerId) => void;
  onPauseTimer: (timerId: TimerId) => void;
  onResetTimer: (timerId: TimerId) => void;
};

type TestFieldCardProps = TimerHandlers & {
  test: WaterTestProfile;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  thresholds: Record<string, import("@/lib/water-test-config").WaterTestThreshold>;
  timerGroups: WaterTestTimerGroup[];
};

function TestFieldCard({
  test,
  value,
  onChange,
  error,
  thresholds,
  timerGroups,
  views,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: TestFieldCardProps) {
  const numericValue = value.trim() ? parseNonNegativeNumber(value).value : undefined;
  const threshold: ThresholdEvaluation | null =
    numericValue !== undefined ? evaluateThreshold(thresholds, test.key, numericValue) : null;
  const wqStatus = threshold ? thresholdToWaterQualityStatus(threshold.status) : null;

  const linkedTimers = timerGroupsForField(timerGroups, test.key);
  const inputId = `water-test-${test.key}`;

  return (
    <section className="rounded-card border border-aqua-deep/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={test.input_type === "select" ? undefined : inputId} className="block text-sm font-semibold text-aqua-deep">
          {test.label}
          {test.brand ? (
            <span className="ml-2 text-xs font-normal text-aqua-deep/55">{test.brand}</span>
          ) : null}
        </label>
        {wqStatus && wqStatus !== "unknown" && threshold ? (
          <ThresholdBadge status={wqStatus} message={threshold.message} />
        ) : null}
      </div>

      {test.input_type === "select" && test.values.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {test.values.map((opt) => {
            const selected = value === String(opt.value) || value === opt.label;
            return (
              <button
                key={`${test.key}-${opt.value}`}
                type="button"
                onClick={() => onChange(String(opt.value))}
                className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium ${
                  selected
                    ? "border-aqua-blue bg-aqua-blue text-white"
                    : "border-aqua-deep/20 bg-aqua-soft text-aqua-deep hover:border-aqua-blue/50"
                }`}
              >
                {opt.label}
                {test.unit ? ` ${test.unit}` : ""}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <input
            id={inputId}
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`min-h-[48px] w-full rounded-lg border px-3 py-2.5 text-base text-aqua-deep ${
              error ? "border-status-critical" : "border-aqua-deep/20"
            }`}
          />
          {test.unit ? (
            <span className="inline-flex min-h-[48px] shrink-0 items-center rounded-lg border border-aqua-deep/10 bg-aqua-soft px-3 text-sm font-medium text-aqua-deep/80">
              {test.unit}
            </span>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-1 text-xs text-status-critical">
          {error}
        </p>
      ) : null}

      {threshold?.message && wqStatus && wqStatus !== "unknown" ? (
        <p className="mt-2 text-xs text-aqua-deep/75">{threshold.message}</p>
      ) : null}

      {views && linkedTimers.length > 0 ? (
        <div className="mt-3 space-y-2">
          {linkedTimers.map((group) => (
            <TimerGroupPanel
              key={group.groupId}
              group={group}
              views={views}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResetTimer={onResetTimer}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ThresholdBadge({ status, message }: { status: string; message?: string }) {
  const label = waterQualityLabelDE(status);
  const color =
    status === "green"
      ? "bg-status-success/15 text-status-success ring-status-success/30"
      : status === "observe" || status === "warning"
        ? "bg-status-warning/15 text-aqua-deep ring-status-warning/40"
        : status === "critical"
          ? "bg-status-critical/15 text-status-critical ring-status-critical/30"
          : "bg-aqua-soft text-aqua-deep/70 ring-aqua-deep/10";

  return (
    <span
      title={message}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${color}`}
    >
      {label}
    </span>
  );
}

type TimerGroupsSectionProps = TimerHandlers & {
  title: string;
  description?: string;
  standbyHint?: string;
  groups: WaterTestTimerGroup[];
};

function TimerGroupsSection({
  title,
  description,
  standbyHint,
  groups,
  views,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: TimerGroupsSectionProps) {
  if (groups.length === 0) return null;

  return (
    <section className="rounded-card border border-aqua-deep/10 bg-white p-4">
      <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
      {description ? <p className="mt-1 text-xs text-aqua-deep/70">{description}</p> : null}
      {standbyHint ? (
        <p className="mt-2 rounded-lg border border-aqua-blue/20 bg-aqua-soft/50 px-3 py-2 text-xs text-aqua-deep/80">
          {standbyHint}
        </p>
      ) : null}
      <div className="mt-3 space-y-3">
        {groups.map((group) => (
          <TimerGroupPanel
            key={group.groupId}
            group={group}
            views={views}
            onStartTimer={onStartTimer}
            onPauseTimer={onPauseTimer}
            onResetTimer={onResetTimer}
          />
        ))}
      </div>
    </section>
  );
}

type TimerGroupPanelProps = TimerHandlers & {
  group: WaterTestTimerGroup;
};

function TimerGroupPanel({
  group,
  views,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: TimerGroupPanelProps) {
  return (
    <div className="space-y-2">
      {group.steps.map((step) => {
        const timerId = waterTestTimerId(group.groupId, step.stepId);
        const view = views[timerId];
        if (!view) return null;

        const heading =
          group.steps.length > 1
            ? `JBL Timer ${group.displayName} – ${step.stepLabel}`
            : `JBL Timer ${group.displayName}`;

        return (
          <TimerPanel
            key={timerId}
            heading={heading}
            view={view}
            onStart={() => (view.isRunning ? onPauseTimer(timerId) : onStartTimer(timerId))}
            onReset={() => onResetTimer(timerId)}
          />
        );
      })}
    </div>
  );
}

type TimerPanelProps = {
  heading: string;
  view: TimerView;
  onStart: () => void;
  onReset: () => void;
};

function TimerPanel({ heading, view, onStart, onReset }: TimerPanelProps) {
  const expired = view.isExpired;

  return (
    <div
      className={`rounded-lg border p-3 ${
        expired
          ? "border-status-critical bg-status-critical/10 ring-2 ring-status-critical/30"
          : "border-aqua-blue/20 bg-aqua-soft/60"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          expired ? "text-status-critical" : "text-aqua-deep/60"
        }`}
      >
        {heading}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${expired ? "text-status-critical" : "text-aqua-deep"}`}
        aria-live="polite"
      >
        {expired ? "00:00" : mmss(view.remainingSeconds)}
      </p>
      {view.expiredMessage ? (
        <p role="status" className="mt-2 text-sm font-semibold text-status-critical">
          {view.expiredMessage}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStart}
          disabled={expired}
          className="min-h-[40px] rounded-button bg-aqua-blue px-3 py-2 text-xs font-semibold text-white hover:bg-[#168EAA] disabled:opacity-50"
        >
          {view.isRunning ? "Pause" : expired ? "Abgelaufen" : "Start"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-[40px] rounded-button border border-aqua-blue bg-white px-3 py-2 text-xs font-semibold text-aqua-deep hover:bg-aqua-soft"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
