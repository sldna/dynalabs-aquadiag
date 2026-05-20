"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { browserApiBase } from "@/lib/api-base";

type QuickWaterTestFormProps = {
  tankId: number;
  tankName: string;
};

type ParsedNumber = { value?: number; error?: string };

type TimerKey = "nitrite_no2" | "nitrate_no3" | "ammonium_nh4" | "phosphate_po4" | "iron_fe";

type TimerState = {
  remainingSec: number;
  running: boolean;
};

type TimerConfig = {
  key: TimerKey;
  label: string;
  durationSec: number;
};

const TIMER_CONFIGS: TimerConfig[] = [
  { key: "nitrite_no2", label: "NO₂", durationSec: 3 * 60 },
  { key: "nitrate_no3", label: "NO₃", durationSec: 10 * 60 },
  { key: "ammonium_nh4", label: "NH₄", durationSec: 5 * 60 },
  { key: "phosphate_po4", label: "PO₄", durationSec: 10 * 60 },
  { key: "iron_fe", label: "Fe", durationSec: 10 * 60 },
];

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

function initialTimers(): Record<TimerKey, TimerState> {
  return {
    nitrite_no2: { remainingSec: 3 * 60, running: false },
    nitrate_no3: { remainingSec: 10 * 60, running: false },
    ammonium_nh4: { remainingSec: 5 * 60, running: false },
    phosphate_po4: { remainingSec: 10 * 60, running: false },
    iron_fe: { remainingSec: 10 * 60, running: false },
  };
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

  const [timers, setTimers] = useState<Record<TimerKey, TimerState>>(() => initialTimers());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTestId, setSavedTestId] = useState<number | null>(null);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        (Object.keys(prev) as TimerKey[]).forEach((key) => {
          const timer = prev[key];
          if (!timer.running) return;
          if (timer.remainingSec <= 1) {
            next[key] = { remainingSec: 0, running: false };
          } else {
            next[key] = { remainingSec: timer.remainingSec - 1, running: true };
          }
          changed = true;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(handle);
  }, []);

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

  const startTimer = (key: TimerKey) => {
    setTimers((prev) => ({
      ...prev,
      [key]: { ...prev[key], running: true },
    }));
  };

  const pauseTimer = (key: TimerKey) => {
    setTimers((prev) => ({
      ...prev,
      [key]: { ...prev[key], running: false },
    }));
  };

  const resetTimer = (key: TimerKey) => {
    const cfg = TIMER_CONFIGS.find((item) => item.key === key);
    if (!cfg) return;
    setTimers((prev) => ({
      ...prev,
      [key]: { remainingSec: cfg.durationSec, running: false },
    }));
  };

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
          timerKey="nitrite_no2"
          timers={timers}
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
          timerKey="nitrate_no3"
          timers={timers}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
        />
        <FieldCard
          label="Ammonium (NH₄)"
          unit="mg/l"
          value={ammoniumNh4}
          onChange={setAmmoniumNh4}
          error={validation.ammoniumNh4.error}
          timerKey="ammonium_nh4"
          timers={timers}
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
          timerKey="phosphate_po4"
          timers={timers}
          onStartTimer={startTimer}
          onPauseTimer={pauseTimer}
          onResetTimer={resetTimer}
        />
        <FieldCard
          label="Eisen (Fe)"
          unit="mg/l"
          value={ironFe}
          onChange={setIronFe}
          error={validation.ironFe.error}
          timerKey="iron_fe"
          timers={timers}
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

type FieldCardProps = {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  timerKey?: TimerKey;
  timers?: Record<TimerKey, TimerState>;
  onStartTimer?: (key: TimerKey) => void;
  onPauseTimer?: (key: TimerKey) => void;
  onResetTimer?: (key: TimerKey) => void;
};

function FieldCard({
  label,
  unit,
  value,
  onChange,
  error,
  placeholder,
  timerKey,
  timers,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: FieldCardProps) {
  const timerCfg = timerKey ? TIMER_CONFIGS.find((item) => item.key === timerKey) : undefined;
  const timer = timerKey && timers ? timers[timerKey] : undefined;

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

      {timerCfg && timer && onStartTimer && onPauseTimer && onResetTimer ? (
        <div className="mt-3 rounded-lg border border-aqua-blue/20 bg-aqua-soft/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-aqua-deep/60">
            JBL Timer {timerCfg.label}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-aqua-deep">
            {mmss(timer.remainingSec)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => (timer.running ? onPauseTimer(timerCfg.key) : onStartTimer(timerCfg.key))}
              className="min-h-[40px] rounded-button bg-aqua-blue px-3 py-2 text-xs font-semibold text-white hover:bg-[#168EAA]"
            >
              {timer.running ? "Pause" : "Start"}
            </button>
            <button
              type="button"
              onClick={() => onResetTimer(timerCfg.key)}
              className="min-h-[40px] rounded-button border border-aqua-blue bg-white px-3 py-2 text-xs font-semibold text-aqua-deep hover:bg-aqua-soft"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
