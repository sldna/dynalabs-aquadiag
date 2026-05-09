"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { browserApiBase } from "@/lib/api-base";
import type {
  DiagnoseAPIResponse,
  Tank,
} from "@/lib/types";
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
      if (isMockEnabled()) {
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

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        aria-busy={busy}
        className="space-y-5 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-aqua-deep">
            Symptome (Mehrfachauswahl)
          </legend>
          <div className="space-y-3">
            {SYMPTOM_GROUPS.map((g) => (
              <div key={g.id} className="space-y-2">
                <p className="text-xs font-semibold text-aqua-deep/75">{g.label}</p>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(s.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 disabled:opacity-60 ${
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
          <label className="text-sm text-aqua-deep/90">
            pH
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
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
          <label className="text-sm text-aqua-deep/90">
            KH (°dKH, CaCO
            <sub className="text-[0.85em]">3</sub>
            -Äquivalent)
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
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
          <label className="text-sm text-aqua-deep/90">
            GH (°dGH, Ca
            <sup className="text-[0.72em]">2+</sup>
            /Mg
            <sup className="text-[0.72em]">2+</sup>
            )
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
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
          <label className="text-sm text-aqua-deep/90">
            Temperatur (°C)
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
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
          <label className="text-sm text-aqua-deep/90">
            Nitrit (NO
            <sub className="text-[0.85em]">2</sub>
            <sup className="text-[0.75em]">−</sup>
            , mg/l)
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
                validation.nitrite.error ? "border-status-critical" : "border-aqua-deep/20"
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
          <label className="text-sm text-aqua-deep/90">
            Nitrat (NO
            <sub className="text-[0.85em]">3</sub>
            <sup className="text-[0.75em]">−</sup>
            , mg/l)
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
                validation.nitrate.error ? "border-status-critical" : "border-aqua-deep/20"
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
          <label className="text-sm text-aqua-deep/90">
            Ammonium (NH
            <sub className="text-[0.85em]">4</sub>
            <sup className="text-[0.75em]">+</sup>
            , mg/l)
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
                validation.ammonia.error ? "border-status-critical" : "border-aqua-deep/20"
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
          <label className="text-sm text-aqua-deep/90">
            O
            <sub className="text-[0.85em]">2</sub>
            {" (mg/l)"}
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
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
          <label className="text-sm text-aqua-deep/90">
            CO
            <sub className="text-[0.85em]">2</sub>
            {" "}
            (mg/l, geschätzt)
            <input
              inputMode="decimal"
              disabled={busy}
              className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
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
          <label className="block text-sm text-aqua-deep/90">
            Notiz (optional)
            <input
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-aqua-deep/20 px-3 py-2 disabled:opacity-60"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. seit wann, was wurde geändert, welche Tiere betroffen sind"
            />
          </label>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-aqua-deep">Becken</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setTankMode("existing")}
              className={`rounded-lg px-3 py-2 text-sm ring-1 disabled:opacity-60 ${
                tankMode === "existing"
                  ? "bg-aqua-soft ring-aqua-blue text-aqua-deep"
                  : "bg-white ring-aqua-deep/15 text-aqua-deep/90"
              }`}
            >
              Aus Liste
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setTankMode("new")}
              className={`rounded-lg px-3 py-2 text-sm ring-1 disabled:opacity-60 ${
                tankMode === "new"
                  ? "bg-aqua-soft ring-aqua-blue text-aqua-deep"
                  : "bg-white ring-aqua-deep/15 text-aqua-deep/90"
              }`}
            >
              Neu anlegen
            </button>
          </div>
          {tankMode === "existing" ? (
            <label className="block text-sm text-aqua-deep/90">
              Becken wählen
              <select
                disabled={busy}
                className="mt-1 w-full rounded-lg border border-aqua-deep/20 bg-white px-3 py-2 text-aqua-deep disabled:opacity-60"
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
                    {t.name} ({t.volume_liters} l)
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-3">
              <label className="block text-sm text-aqua-deep/90">
                Name
                <input
                  disabled={busy}
                  className="mt-1 w-full rounded-lg border border-aqua-deep/20 px-3 py-2 disabled:opacity-60"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>
              <label className="block text-sm text-aqua-deep/90">
                Liter (optional)
                <input
                  inputMode="decimal"
                  disabled={busy}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 disabled:opacity-60 ${
                    validation.newVolume.error ? "border-status-critical" : "border-aqua-deep/20"
                  }`}
                  value={newVolume}
                  onChange={(e) => setNewVolume(e.target.value)}
                  placeholder="z. B. 180"
                />
                {validation.newVolume.error ? (
                  <span className="mt-1 block text-xs text-status-critical" role="alert">
                    {validation.newVolume.error}
                  </span>
                ) : null}
              </label>
            </div>
          )}
          {initialTanks.length === 0 && tankMode === "existing" ? (
            <p className="text-sm text-status-alert">
              Noch keine Becken. Unter{" "}
              <Link href="/dashboard/tanks" className="underline">
                Becken
              </Link>{" "}
              anlegen oder „Neu anlegen“ wählen.
            </p>
          ) : null}
        </fieldset>

        {error ? (
          <p className="text-sm text-status-critical" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || hasValidationErrors}
          className="w-full rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
        >
          {busy ? "Diagnose läuft…" : "Diagnose starten"}
        </button>
      </form>

      {result ? (
        <p className="text-center text-xs text-aqua-deep/55">
          {"meta" in result && result.meta ? (
            <>
              Diagnose-ID {result.meta.diagnosis_id} · Becken-ID {result.meta.tank_id}
            </>
          ) : (
            <>Diagnose-Ergebnis empfangen</>
          )}
        </p>
      ) : null}

      {busy ? (
        <DiagnosisResultLoading />
      ) : result ? (
        <DiagnosisResult
          result={result}
          onRetry={() => {
            setError(null);
            setResult(null);
          }}
        />
      ) : (
        <DiagnosisResultEmpty />
      )}
    </div>
  );
}
