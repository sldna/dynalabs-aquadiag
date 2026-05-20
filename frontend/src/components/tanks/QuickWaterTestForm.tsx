"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { browserApiBase } from "@/lib/api-base";
import { useJblWaterTestTimers } from "@/hooks/useJblWaterTestTimers";
import type { JblTimerView } from "@/lib/jbl-timer-runtime";
import {
  type JblTimerId,
  type JblWaterTestTimerGroup,
  jblTimerGroupsForField,
  jblTimerGroupsWithoutField,
  jblTimerId,
} from "@/lib/jbl-water-test-timers";

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

export function QuickWaterTestForm({ tankId, tankName }: QuickWaterTestFormProps) {
  const [temperatureC, setTemperatureC] = useState("");
  const [ph, setPh] = useState("");
  const [kh, setKh] = useState("");
  const [gh, setGh] = useState("");
  const [nitriteNo2, setNitriteNo2] = useState("");
  const [nitrateNo3, setNitrateNo3] = useState("");
  const [ammoniumNh4, setAmmoniumNh4] = useState("");
  const [phosphatePo4, setPhosphatePo4] = useState("");
  const [ironFe, setIronFe] = useState("");
  const [notes, setNotes] = useState("");

  const { views, startTimer, pauseTimer, resetTimer } = useJblWaterTestTimers(tankId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTestId, setSavedTestId] = useState<number | null>(null);

  const standaloneTimerGroups = useMemo(() => jblTimerGroupsWithoutField(), []);

  const validation = useMemo(
    () => ({
      temperatureC: parseNonNegativeNumber(temperatureC),
      ph: parseNonNegativeNumber(ph),
      kh: parseNonNegativeNumber(kh),
      gh: parseNonNegativeNumber(gh),
      nitriteNo2: parseNonNegativeNumber(nitriteNo2),
      nitrateNo3: parseNonNegativeNumber(nitrateNo3),
      ammoniumNh4: parseNonNegativeNumber(ammoniumNh4),
      phosphatePo4: parseNonNegativeNumber(phosphatePo4),
      ironFe: parseNonNegativeNumber(ironFe),
    }),
    [temperatureC, ph, kh, gh, nitriteNo2, nitrateNo3, ammoniumNh4, phosphatePo4, ironFe],
  );

  const hasValidationErrors = Object.values(validation).some((v) => Boolean(v.error));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (hasValidationErrors) {
      setError("Bitte korrigiere die markierten Eingaben.");
      return;
    }

    const payload: Record<string, number | string> = {};
    if (validation.temperatureC.value !== undefined) payload.temperature_c = validation.temperatureC.value;
    if (validation.ph.value !== undefined) payload.ph = validation.ph.value;
    if (validation.kh.value !== undefined) payload.kh = validation.kh.value;
    if (validation.gh.value !== undefined) payload.gh = validation.gh.value;
    if (validation.nitriteNo2.value !== undefined) payload.nitrite_no2 = validation.nitriteNo2.value;
    if (validation.nitrateNo3.value !== undefined) payload.nitrate_no3 = validation.nitrateNo3.value;
    if (validation.ammoniumNh4.value !== undefined) payload.ammonium_nh4 = validation.ammoniumNh4.value;
    if (validation.phosphatePo4.value !== undefined) payload.phosphate_po4 = validation.phosphatePo4.value;
    if (validation.ironFe.value !== undefined) payload.iron_fe = validation.ironFe.value;
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

      <form id="quick-water-test-form" onSubmit={onSubmit} className="space-y-4 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card sm:p-5">
        <FieldCard
          label="Temperatur"
          unit="°C"
          value={temperatureC}
          onChange={setTemperatureC}
          error={validation.temperatureC.error}
          placeholder="z. B. 24.8"
        />
        <FieldCard label="pH" unit="" value={ph} onChange={setPh} error={validation.ph.error} placeholder="z. B. 7.1" />
        <FieldCard label="KH" unit="°dKH" value={kh} onChange={setKh} error={validation.kh.error} />
        <FieldCard label="GH" unit="°dGH" value={gh} onChange={setGh} error={validation.gh.error} />
        <FieldCard
          label="Nitrit (NO₂)"
          unit="mg/l"
          value={nitriteNo2}
          onChange={setNitriteNo2}
          error={validation.nitriteNo2.error}
          fieldKey="nitrite_no2"
          views={views}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
        />
        <FieldCard
          label="Nitrat (NO₃)"
          unit="mg/l"
          value={nitrateNo3}
          onChange={setNitrateNo3}
          error={validation.nitrateNo3.error}
        />
        <FieldCard
          label="Ammonium (NH₄)"
          unit="mg/l"
          value={ammoniumNh4}
          onChange={setAmmoniumNh4}
          error={validation.ammoniumNh4.error}
          fieldKey="ammonium_nh4"
          views={views}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
        />
        <FieldCard
          label="Phosphat (PO₄)"
          unit="mg/l"
          value={phosphatePo4}
          onChange={setPhosphatePo4}
          error={validation.phosphatePo4.error}
        />
        <FieldCard
          label="Eisen (Fe)"
          unit="mg/l"
          value={ironFe}
          onChange={setIronFe}
          error={validation.ironFe.error}
          fieldKey="iron_fe"
          views={views}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
        />

        <JblTimerGroupsSection
          title="Weitere JBL-Wassertest-Timer"
          description="Timer für Tests ohne eigenes Eingabefeld – parallel zu den Messwert-Timern nutzbar."
          standbyHint={STANDBY_HINT}
          groups={standaloneTimerGroups}
          views={views}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
        />

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
  views: Record<JblTimerId, JblTimerView>;
  onStartTimer: (timerId: JblTimerId) => void;
  onPauseTimer: (timerId: JblTimerId) => void;
  onResetTimer: (timerId: JblTimerId) => void;
};

type FieldCardProps = {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  fieldKey?: string;
} & Partial<TimerHandlers>;

function FieldCard({
  label,
  unit,
  value,
  onChange,
  error,
  placeholder,
  fieldKey,
  views,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: FieldCardProps) {
  const timerGroups = fieldKey ? jblTimerGroupsForField(fieldKey) : [];

  return (
    <section className="rounded-card border border-aqua-deep/10 bg-white p-4">
      <label className="block text-sm font-semibold text-aqua-deep">
        {label}
        <div className="mt-2 flex items-center gap-2">
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`min-h-[48px] w-full rounded-lg border px-3 py-2.5 text-base text-aqua-deep ${
              error ? "border-status-critical" : "border-aqua-deep/20"
            }`}
          />
          {unit ? (
            <span className="inline-flex min-h-[48px] items-center rounded-lg border border-aqua-deep/10 bg-aqua-soft px-3 text-sm font-medium text-aqua-deep/80">
              {unit}
            </span>
          ) : null}
        </div>
      </label>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-status-critical">
          {error}
        </p>
      ) : null}

      {views && onStartTimer && onPauseTimer && onResetTimer && timerGroups.length > 0 ? (
        <div className="mt-3 space-y-2">
          {timerGroups.map((group) => (
            <JblTimerGroupPanel
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

type JblTimerGroupsSectionProps = TimerHandlers & {
  title: string;
  description?: string;
  standbyHint?: string;
  groups: JblWaterTestTimerGroup[];
};

function JblTimerGroupsSection({
  title,
  description,
  standbyHint,
  groups,
  views,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: JblTimerGroupsSectionProps) {
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
          <JblTimerGroupPanel
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

type JblTimerGroupPanelProps = TimerHandlers & {
  group: JblWaterTestTimerGroup;
};

function JblTimerGroupPanel({
  group,
  views,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: JblTimerGroupPanelProps) {
  return (
    <div className="space-y-2">
      {group.steps.map((step) => {
        const timerId = jblTimerId(group.groupId, step.stepId);
        const view = views[timerId];
        if (!view) return null;

        const heading =
          group.steps.length > 1
            ? `JBL Timer ${group.displayName} – ${step.stepLabel}`
            : `JBL Timer ${group.displayName}`;

        return (
          <JblTimerPanel
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

type JblTimerPanelProps = {
  heading: string;
  view: JblTimerView;
  onStart: () => void;
  onReset: () => void;
};

function JblTimerPanel({ heading, view, onStart, onReset }: JblTimerPanelProps) {
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
