"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { browserApiBase } from "@/lib/api-base";
import { appendFollowUpAnswersToNotes } from "@/lib/follow-up-notes";
import type { DiagnoseAPIResponse, Tank } from "@/lib/types";
import {
  DiagnosisResult,
  DiagnosisResultEmpty,
  DiagnosisResultLoading,
} from "@/components/diagnosis/DiagnosisResult";
import { mockDiagnoseResponse } from "@/lib/mock-diagnose";

type SymptomOption = { id: string; label: string };
type SymptomGroup = { id: string; label: string; options: SymptomOption[] };

const SYMPTOM_GROUPS: SymptomGroup[] = [
  {
    id: "water_appearance",
    label: "Wasserbild",
    options: [
      { id: "cloudy_water", label: "Trüb" },
      { id: "milky_water", label: "Milchig" },
      { id: "white_haze", label: "Weißlicher Schleier" },
      { id: "green_water", label: "Grünlich / Grünalgen" },
      { id: "bacterial_bloom", label: "Verdacht Bakterienblüte" },
    ],
  },
  {
    id: "fish_behavior",
    label: "Fischverhalten",
    options: [
      { id: "fish_gasping_surface", label: "Schnappen an der Oberfläche" },
      { id: "gasping", label: "Hecheln / Keuchen" },
      { id: "labored_breathing", label: "Erschwerte Atmung" },
      { id: "fish_gasping_morning", label: "Morgens schlechter / gaspen" },
    ],
  },
  {
    id: "algae",
    label: "Algen",
    options: [
      { id: "algae_on_glass", label: "Auf Scheiben" },
      { id: "algae_carpet", label: "Algenteppich" },
      { id: "heavy_algae", label: "Starker Befall" },
    ],
  },
  {
    id: "co2_ph_related",
    label: "CO2 / pH",
    options: [
      { id: "co2_related_ph_swings", label: "pH schwankt (CO2?)" },
      { id: "heavy_co2_dosing", label: "Viel CO2" },
    ],
  },
];

function parseNonNegativeNumber(input: string): {
  value?: number;
  error?: string;
} {
  const t = input.trim();
  if (t === "") return {};
  if (t.startsWith("-")) return { error: "Wert darf nicht negativ sein." };
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n)) return { error: "Bitte eine Zahl eingeben." };
  if (n < 0) return { error: "Wert darf nicht negativ sein." };
  return { value: n };
}

function isMockEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DIAGNOSE_MOCK === "1";
}

export function DiagnoseForm({
  initialTanks,
  initialTankId,
}: {
  initialTanks: Tank[];
  initialTankId?: number;
}) {
  const mock = isMockEnabled();

  const preselected =
    initialTankId !== undefined &&
    initialTanks.some((t) => t.id === initialTankId)
      ? initialTankId
      : undefined;
  const [tankMode, setTankMode] = useState<"existing" | "new">(
    initialTanks.length ? "existing" : "new",
  );
  const [tankId, setTankId] = useState<number | "">(
    preselected ?? initialTanks[0]?.id ?? "",
  );
  const [newName, setNewName] = useState("");
  const [newVolume, setNewVolume] = useState("");

  const [ph, setPh] = useState("");
  const [kh, setKh] = useState("");
  const [gh, setGh] = useState("");
  const [temp, setTemp] = useState("");
  const [nitrite, setNitrite] = useState("");
  const [nitrate, setNitrate] = useState("");
  const [ammonia, setAmmonia] = useState("");
  const [o2, setO2] = useState("");
  const [co2, setCo2] = useState("");
  const [notes, setNotes] = useState("");

  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnoseAPIResponse | null>(null);

  const symptoms = useMemo(() => Array.from(picked), [picked]);

  const validation = useMemo(() => {
    return {
      newVolume: parseNonNegativeNumber(newVolume),
      ph: parseNonNegativeNumber(ph),
      kh: parseNonNegativeNumber(kh),
      gh: parseNonNegativeNumber(gh),
      temp: parseNonNegativeNumber(temp),
      nitrite: parseNonNegativeNumber(nitrite),
      nitrate: parseNonNegativeNumber(nitrate),
      ammonia: parseNonNegativeNumber(ammonia),
      o2: parseNonNegativeNumber(o2),
      co2: parseNonNegativeNumber(co2),
    };
  }, [ammonia, co2, gh, kh, newVolume, nitrate, nitrite, o2, ph, temp]);

  const hasValidationErrors = useMemo(() => {
    return Object.values(validation).some((v) => Boolean(v.error));
  }, [validation]);

  const tankSummaryLine = useMemo(() => {
    if (tankMode === "existing" && typeof tankId === "number") {
      const t = initialTanks.find((x) => x.id === tankId);
      if (t) {
        const vol =
          typeof t.volume_liters === "number" && t.volume_liters > 0
            ? ` · ${t.volume_liters} l`
            : "";
        return `${t.name}${vol}`;
      }
      return `Becken #${tankId}`;
    }
    if (tankMode === "new" && newName.trim()) {
      const v = validation.newVolume.value;
      return v !== undefined && v > 0
        ? `${newName.trim()} · ${v} l`
        : newName.trim();
    }
    return null;
  }, [initialTanks, newName, tankId, tankMode, validation.newVolume.value]);

  const saveFollowUpAnswers = useCallback(
    async (answers: Record<string, string>) => {
      if (!result) return;
      const meta = "meta" in result && result.meta ? result.meta : undefined;
      const did = meta?.diagnosis_id;
      if (did === undefined || did === null) {
        throw new Error("Keine Diagnose-ID zum Speichern.");
      }

      if (mock) {
        setResult((prev) =>
          prev ? { ...prev, follow_up_answers: { ...answers } } : prev,
        );
        return;
      }

      const res = await fetch(`${browserApiBase()}/v1/diagnoses/${did}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow_up_answers: answers }),
      });
      const raw: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          raw &&
          typeof raw === "object" &&
          raw !== null &&
          "message" in raw &&
          typeof (raw as { message: unknown }).message === "string"
            ? (raw as { message: string }).message
            : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const payload = raw as { follow_up_answers?: Record<string, string> };
      const merged = payload.follow_up_answers ?? answers;
      setResult((prev) => (prev ? { ...prev, follow_up_answers: merged } : prev));
    },
    [mock, result],
  );

  const handleNewAnalysisWithAnswers = useCallback(
    (answers: Record<string, string>) => {
      if (result?.status === "matched" && result.top_diagnosis) {
        const qs = result.top_diagnosis.follow_up_questions_de;
        setNotes((n) => appendFollowUpAnswersToNotes(n, qs, answers));
      }
      setResult(null);
      setError(null);
    },
    [result],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (hasValidationErrors) {
      setError("Bitte korrigiere die markierten Eingaben.");
      return;
    }

    const water: Record<string, number | string> = {};
    if (validation.ph.value !== undefined) water.ph = validation.ph.value;
    if (validation.kh.value !== undefined) water.kh_dkh = validation.kh.value;
    if (validation.gh.value !== undefined) water.gh_dgh = validation.gh.value;
    if (validation.temp.value !== undefined) water.temp_c = validation.temp.value;
    if (validation.nitrite.value !== undefined)
      water.nitrite_mg_l = validation.nitrite.value;
    if (validation.nitrate.value !== undefined)
      water.nitrate_mg_l = validation.nitrate.value;
    if (validation.ammonia.value !== undefined)
      water.ammonium_mg_l = validation.ammonia.value;
    if (validation.o2.value !== undefined)
      water.oxygen_mg_l = validation.o2.value;
    if (validation.co2.value !== undefined) water.co2_mg_l = validation.co2.value;

    const payload: Record<string, unknown> = {
      water,
      symptoms,
    };

    if (tankMode === "existing") {
      if (tankId === "" || typeof tankId !== "number") {
        setError("Becken wählen oder „Neu anlegen“ nutzen.");
        return;
      }
      payload.tank_id = tankId;
    } else {
      if (!newName.trim()) {
        setError("Beckenname für neues Becken eingeben.");
        return;
      }
      payload.tank = {
        name: newName.trim(),
        volume_liters: validation.newVolume.value ?? 0,
      };
    }

    const hasWater = Object.keys(water).length > 0;
    const n = notes.trim();
    if (!hasWater && symptoms.length === 0 && !n) {
      setError("Mindestens ein Symptom oder ein Messwert.");
      return;
    }
    if (n) water.notes = n;

    setBusy(true);
    try {
      if (mock) {
        await new Promise((r) => setTimeout(r, 450));
        setResult(mockDiagnoseResponse());
      } else {
        const res = await fetch(`${browserApiBase()}/v1/diagnose`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const raw: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            raw &&
            typeof raw === "object" &&
            raw !== null &&
            "message" in raw &&
            typeof (raw as { message: unknown }).message === "string"
              ? (raw as { message: string }).message
              : `HTTP ${res.status}`;
          setError(msg);
          return;
        }
        const data = raw as DiagnoseAPIResponse;
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  const sidebarTank =
    tankMode === "existing" && typeof tankId === "number"
      ? initialTanks.find((t) => t.id === tankId)
      : null;

  return (
    <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px]">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,290px)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-6">
          <form
            id="diagnose-form"
            onSubmit={onSubmit}
            aria-busy={busy}
            className="space-y-5 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card sm:p-5"
          >
            <fieldset className="space-y-3">
              <legend className="text-base font-semibold text-aqua-deep">
                Becken
              </legend>

              {initialTanks.length === 0 ? (
                <div className="rounded-xl bg-aqua-soft p-4 ring-1 ring-aqua-deep/15">
                  <p className="text-sm text-aqua-deep/90">
                    Noch kein Becken vorhanden. Lege zuerst ein Becken an oder nutze
                    „Neu anlegen“ für diese Messung.
                  </p>
                  <Link
                    href="/dashboard/tanks"
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA]"
                  >
                    Becken anlegen
                  </Link>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || initialTanks.length === 0}
                  onClick={() => setTankMode("existing")}
                  className={`min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium ring-1 disabled:opacity-60 ${
                    tankMode === "existing"
                      ? "bg-aqua-soft ring-aqua-blue text-aqua-deep"
                      : "bg-white ring-aqua-deep/15 text-aqua-deep/90"
                  }`}
                >
                  Becken wählen
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setTankMode("new")}
                  className={`min-h-[44px] rounded-lg px-4 py-2.5 text-sm font-medium ring-1 disabled:opacity-60 ${
                    tankMode === "new"
                      ? "bg-aqua-soft ring-aqua-blue text-aqua-deep"
                      : "bg-white ring-aqua-deep/15 text-aqua-deep/90"
                  }`}
                >
                  Neu anlegen
                </button>
              </div>

              {tankMode === "existing" ? (
                <label className="block text-sm font-medium text-aqua-deep">
                  Becken für diese Analyse
                  <select
                    disabled={busy || initialTanks.length === 0}
                    className="mt-2 min-h-[44px] w-full rounded-lg border border-aqua-deep/20 bg-white px-3 py-2.5 text-base text-aqua-deep disabled:opacity-60 md:text-sm"
                    value={tankId === "" ? "" : String(tankId)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTankId(v === "" ? "" : Number(v));
                    }}
                  >
                    {initialTanks.length === 0 ? (
                      <option value="">— Keine Becken —</option>
                    ) : null}
                    {initialTanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {typeof t.volume_liters === "number" && t.volume_liters > 0
                          ? ` (${t.volume_liters} l)`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid gap-3">
                  <label className="block text-sm font-medium text-aqua-deep">
                    Name des neuen Beckens
                    <input
                      disabled={busy}
                      className="mt-2 min-h-[44px] w-full rounded-lg border border-aqua-deep/20 px-3 py-2.5 text-base text-aqua-deep disabled:opacity-60 md:text-sm"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-sm font-medium text-aqua-deep">
                    Volumen in Litern (optional)
                    <input
                      inputMode="decimal"
                      disabled={busy}
                      className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                        validation.newVolume.error
                          ? "border-status-critical"
                          : "border-aqua-deep/20"
                      }`}
                      value={newVolume}
                      onChange={(e) => setNewVolume(e.target.value)}
                      placeholder="z. B. 180"
                    />
                    {validation.newVolume.error ? (
                      <span
                        className="mt-1 block text-xs text-status-critical"
                        role="alert"
                      >
                        {validation.newVolume.error}
                      </span>
                    ) : null}
                  </label>
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-aqua-deep">
                Symptome (Mehrfachauswahl)
              </legend>
              <div className="space-y-3">
                {SYMPTOM_GROUPS.map((g) => (
                  <div key={g.id} className="space-y-2">
                    <p className="text-xs font-semibold text-aqua-deep/75">
                      {g.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {g.options.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          disabled={busy}
                          onClick={() => toggle(s.id)}
                          aria-pressed={picked.has(s.id)}
                          className={`min-h-[44px] rounded-full px-4 py-2.5 text-sm font-medium ring-1 disabled:opacity-60 ${
                            picked.has(s.id)
                              ? "bg-aqua-blue text-white ring-aqua-deep/35"
                              : "bg-aqua-sand/50 text-aqua-deep/90 ring-aqua-deep/15"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-aqua-deep">
                Wasserwerte (optional; Härte °dKH/°dGH, Ionen in mg/l, O
                <sub className="text-[0.85em]">2</sub>
                {" in mg/l)"}
              </legend>
              <label className="text-sm font-medium text-aqua-deep/90">
                pH
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.ph.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  placeholder="6.8"
                />
                {validation.ph.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.ph.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                KH (°dKH, CaCO
                <sub className="text-[0.85em]">3</sub>
                -Äquivalent)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.kh.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={kh}
                  onChange={(e) => setKh(e.target.value)}
                />
                {validation.kh.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.kh.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                GH (°dGH, Ca
                <sup className="text-[0.72em]">2+</sup>
                /Mg
                <sup className="text-[0.72em]">2+</sup>
                )
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.gh.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={gh}
                  onChange={(e) => setGh(e.target.value)}
                />
                {validation.gh.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.gh.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                Temperatur (°C)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.temp.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                />
                {validation.temp.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.temp.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                Nitrit (NO
                <sub className="text-[0.85em]">2</sub>
                <sup className="text-[0.75em]">−</sup>
                , mg/l)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.nitrite.error
                      ? "border-status-critical"
                      : "border-aqua-deep/20"
                  }`}
                  value={nitrite}
                  onChange={(e) => setNitrite(e.target.value)}
                  placeholder="0.25"
                />
                {validation.nitrite.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.nitrite.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                Nitrat (NO
                <sub className="text-[0.85em]">3</sub>
                <sup className="text-[0.75em]">−</sup>
                , mg/l)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.nitrate.error
                      ? "border-status-critical"
                      : "border-aqua-deep/20"
                  }`}
                  value={nitrate}
                  onChange={(e) => setNitrate(e.target.value)}
                />
                {validation.nitrate.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.nitrate.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                Ammonium (NH
                <sub className="text-[0.85em]">4</sub>
                <sup className="text-[0.75em]">+</sup>
                , mg/l)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.ammonia.error
                      ? "border-status-critical"
                      : "border-aqua-deep/20"
                  }`}
                  value={ammonia}
                  onChange={(e) => setAmmonia(e.target.value)}
                />
                {validation.ammonia.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.ammonia.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                O
                <sub className="text-[0.85em]">2</sub>
                {" (mg/l)"}
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.o2.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={o2}
                  onChange={(e) => setO2(e.target.value)}
                />
                {validation.o2.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.o2.error}
                  </span>
                ) : null}
              </label>
              <label className="text-sm font-medium text-aqua-deep/90">
                CO
                <sub className="text-[0.85em]">2</sub>
                {" "}
                (mg/l, geschätzt)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-2 min-h-[44px] w-full rounded-lg border px-3 py-2.5 text-base disabled:opacity-60 md:text-sm ${
                    validation.co2.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={co2}
                  onChange={(e) => setCo2(e.target.value)}
                />
                {validation.co2.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.co2.error}
                  </span>
                ) : null}
              </label>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold text-aqua-deep">Optional</legend>
              <label className="block text-sm font-medium text-aqua-deep/90">
                Notiz (optional)
                <input
                  disabled={busy}
                  className="mt-2 min-h-[44px] w-full rounded-lg border border-aqua-deep/20 px-3 py-2.5 text-base text-aqua-deep disabled:opacity-60 md:text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="z. B. seit wann, was wurde geändert, welche Tiere betroffen sind"
                />
              </label>
            </fieldset>

            {error ? (
              <p className="text-sm text-status-critical" role="alert">
                {error}
              </p>
            ) : null}

            <div className="hidden md:block">
              <button
                type="submit"
                disabled={busy || hasValidationErrors}
                className="w-full rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
              >
                {busy ? "Diagnose läuft…" : "Diagnose starten"}
              </button>
            </div>
          </form>

          {!result && !busy ? (
            <div className="sticky bottom-0 z-10 border-t border-aqua-deep/10 bg-[linear-gradient(to_top,white,white)] pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
              <button
                type="submit"
                form="diagnose-form"
                disabled={busy || hasValidationErrors}
                className="w-full rounded-button bg-aqua-blue px-4 py-3.5 text-base font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
              >
                Diagnose starten
              </button>
            </div>
          ) : null}

          {busy ? (
            <DiagnosisResultLoading />
          ) : result ? (
            <DiagnosisResult
              result={result}
              tankSummaryLine={tankSummaryLine}
              saveFollowUpAnswers={saveFollowUpAnswers}
              onNewAnalysisWithAnswers={handleNewAnalysisWithAnswers}
              onRetry={() => {
                setError(null);
                setResult(null);
              }}
            />
          ) : (
            <DiagnosisResultEmpty />
          )}
        </div>

        <aside className="mt-8 space-y-4 lg:sticky lg:top-24 lg:mt-0 lg:self-start">
          <div className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card">
            <h2 className="text-sm font-semibold text-aqua-deep">Kontext</h2>
            {sidebarTank ? (
              <dl className="mt-3 space-y-2 text-sm text-aqua-deep/85">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
                    Gewähltes Becken
                  </dt>
                  <dd className="font-medium text-aqua-deep">{sidebarTank.name}</dd>
                </div>
                {sidebarTank.volume_liters > 0 ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
                      Volumen
                    </dt>
                    <dd>{sidebarTank.volume_liters} l</dd>
                  </div>
                ) : null}
              </dl>
            ) : tankMode === "new" ? (
              <p className="mt-3 text-sm text-aqua-deep/80">
                Es wird ein neues Becken mit dieser Messung angelegt.
              </p>
            ) : (
              <p className="mt-3 text-sm text-aqua-deep/80">
                Wähle ein Becken im Formular oder lege eines unter{" "}
                <Link href="/dashboard/tanks" className="font-medium text-aqua-blue underline">
                  Becken
                </Link>{" "}
                an.
              </p>
            )}
          </div>

          <div className="rounded-card bg-aqua-soft/80 p-4 ring-1 ring-aqua-deep/10">
            <h2 className="text-sm font-semibold text-aqua-deep">Kurz-Hilfe</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-aqua-deep/85">
              <li>Symptome und wenige Messwerte reichen oft für erste Hinweise.</li>
              <li>Du kannst das Becken vor dem Absenden noch wechseln.</li>
              <li>Nachfragen kannst du speichern – ohne neue Regelberechnung.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
