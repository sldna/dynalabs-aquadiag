"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  activateWaterTestConfigVersion,
  activeWaterTestProfiles,
  duplicateActiveWaterTestConfig,
  fetchWaterTestConfigVersion,
  fetchWaterTestConfigVersions,
  type WaterTestConfigResponse,
  type WaterTestConfigVersion,
  type WaterTestConfigValidationResult,
  updateWaterTestConfigVersion,
  validateWaterTestConfigVersion,
} from "@/lib/water-test-config";

const STABILITY_HINT = "Änderungen gelten nur für neue Messungen. Bestehende Messungen und Analysen bleiben unverändert.";

export function WaterTestSettingsClient() {
  const [versions, setVersions] = useState<WaterTestConfigVersion[]>([]);
  const [selected, setSelected] = useState<WaterTestConfigResponse | null>(null);
  const [validation, setValidation] = useState<WaterTestConfigValidationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const readonly = selected ? selected.is_active || !selected.is_draft : true;
  const canActivate = Boolean(selected?.id && selected.is_draft && validation?.valid);

  async function load(versionId?: number) {
    setError(null);
    const list = await fetchWaterTestConfigVersions();
    setVersions(list.versions);
    const id = versionId ?? list.versions.find((v) => v.is_active)?.id ?? list.versions[0]?.id;
    if (id) {
      setSelected(await fetchWaterTestConfigVersion(id));
      setValidation(null);
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Konfiguration konnte nicht geladen werden."));
  }, []);

  async function duplicateActive() {
    setBusy(true);
    try {
      const draft = await duplicateActiveWaterTestConfig();
      setMessage("Entwurf aus aktiver Version erstellt.");
      await load(draft.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entwurf konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await updateWaterTestConfigVersion(selected);
      setSelected(updated);
      setValidation(null);
      setMessage("Entwurf gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entwurf konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  async function validateDraft() {
    if (!selected?.id) return;
    setBusy(true);
    try {
      const result = await validateWaterTestConfigVersion(selected.id);
      setValidation(result);
      setMessage(result.valid ? "Validierung erfolgreich." : "Validierung enthält Fehler.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function activateDraft() {
    if (!selected?.id || !canActivate) return;
    setBusy(true);
    try {
      const active = await activateWaterTestConfigVersion(selected.id);
      setMessage(`Aktiviert. ${STABILITY_HINT}`);
      await load(active.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktivierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  function updateSelected(next: WaterTestConfigResponse) {
    setSelected(next);
    setValidation(null);
  }

  const activeName = useMemo(() => versions.find((v) => v.is_active)?.name ?? "Keine aktive Version", [versions]);
  const previewTests = useMemo(() => activeWaterTestProfiles(selected?.tests ?? []), [selected]);

  return (
    <div className="space-y-5">
      <section className="rounded-card border border-aqua-blue/25 bg-aqua-soft/70 p-4 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-aqua-deep/60">Wassertest-Konfiguration</p>
        <h1 className="mt-1 text-2xl font-bold text-aqua-deep">JBL-Werte, Schwellen und Timer</h1>
        <p className="mt-2 text-sm text-aqua-deep/80">{STABILITY_HINT}</p>
        <p className="mt-2 text-xs text-aqua-deep/65">Aktiv: {activeName}</p>
      </section>

      {error ? <p role="alert" className="rounded-card border border-status-critical/30 bg-status-critical/5 p-3 text-sm font-medium text-status-critical">{error}</p> : null}
      {message ? <p className="rounded-card border border-status-success/30 bg-status-success/10 p-3 text-sm text-aqua-deep">{message}</p> : null}

      <section className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-aqua-deep">Versionen</h2>
            <p className="text-sm text-aqua-deep/70">Bearbeitung erfolgt immer über Entwürfe.</p>
          </div>
          <button type="button" disabled={busy} onClick={duplicateActive} className="min-h-[44px] rounded-button bg-aqua-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#168EAA] disabled:opacity-50">
            Aktive Version duplizieren
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {versions.map((v) => (
            <button key={v.id} type="button" onClick={() => load(v.id).catch((err) => setError(String(err)))} className={`rounded-card border p-3 text-left ${selected?.id === v.id ? "border-aqua-blue bg-aqua-soft" : "border-aqua-deep/10 bg-white"}`}>
              <span className="block text-sm font-semibold text-aqua-deep">{v.name}</span>
              <span className="mt-1 block text-xs text-aqua-deep/65">{v.is_active ? "Aktiv" : v.is_draft ? "Entwurf" : "Schreibgeschützt"}</span>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="space-y-4 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-aqua-deep">{selected.name}</h2>
              <p className="text-sm text-aqua-deep/70">{readonly ? "Diese Version ist schreibgeschützt. Dupliziere sie, um Änderungen für zukünftige Messungen vorzunehmen." : "Entwurf ist bearbeitbar."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={readonly || busy} onClick={saveDraft} className="rounded-button border border-aqua-blue px-3 py-2 text-sm font-semibold text-aqua-deep disabled:opacity-50">Speichern</button>
              <button type="button" disabled={busy} onClick={validateDraft} className="rounded-button border border-aqua-blue px-3 py-2 text-sm font-semibold text-aqua-deep disabled:opacity-50">Validieren</button>
              <button type="button" disabled={!canActivate || busy} onClick={activateDraft} className="rounded-button bg-aqua-blue px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" title={STABILITY_HINT}>Aktivieren</button>
            </div>
          </div>

          {validation ? (
            <div className={`rounded-card border p-3 text-sm ${validation.valid ? "border-status-success/40 bg-status-success/10" : "border-status-critical/30 bg-status-critical/5"}`}>
              <p className="font-semibold text-aqua-deep">{validation.valid ? "Validierung erfolgreich" : "Validierungsfehler"}</p>
              {validation.errors && validation.errors.length > 0 ? <ul className="mt-2 list-disc space-y-1 pl-5 text-aqua-deep/80">{validation.errors.map((e) => <li key={`${e.field}-${e.code}`}>{e.field}: {e.message}</li>)}</ul> : null}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-aqua-deep">
              Versionsname
              <input
                disabled={readonly}
                value={selected.name ?? ""}
                onChange={(e) => updateSelected({ ...selected, name: e.target.value })}
                className="mt-1 w-full rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5"
              />
            </label>
            <label className="text-sm font-medium text-aqua-deep">
              Beschreibung
              <input
                disabled={readonly}
                value={selected.description ?? ""}
                onChange={(e) => updateSelected({ ...selected, description: e.target.value })}
                className="mt-1 w-full rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5"
              />
            </label>
          </div>

          <WaterTestFormPreview tests={previewTests} />

          <div className="space-y-3">
            {selected.tests.map((test, index) => (
              <TestEditorCard
                key={test.key}
                test={test}
                readonly={readonly}
                onChange={(next) => {
                  const tests = [...selected.tests];
                  tests[index] = next;
                  updateSelected({ ...selected, tests });
                }}
                onDelete={() => {
                  const ok = window.confirm(`Wassertest "${test.label}" aus diesem Entwurf löschen?`);
                  if (!ok) return;
                  updateSelected({ ...selected, tests: selected.tests.filter((_, idx) => idx !== index) });
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WaterTestFormPreview({ tests }: { tests: NonNullable<WaterTestConfigResponse["tests"]> }) {
  return (
    <section className="rounded-card border border-aqua-blue/25 bg-aqua-soft/50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-aqua-deep">Formular-Vorschau</h3>
          <p className="text-xs text-aqua-deep/70">So erscheinen aktive Messwerte nach der Aktivierung im Erfassungsformular.</p>
        </div>
        <span className="text-xs font-semibold text-aqua-deep/60">{tests.length} aktive Messwerte</span>
      </div>
      <div className="mt-3 space-y-3">
        {tests.length > 0 ? (
          tests.map((test) => (
            <div key={test.key} className="rounded-card border border-aqua-deep/10 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-aqua-deep">
                  {test.label}
                  {test.brand ? <span className="ml-2 text-xs font-normal text-aqua-deep/55">{test.brand}</span> : null}
                </p>
                {test.unit ? <span className="text-xs font-medium text-aqua-deep/60">{test.unit}</span> : null}
              </div>
              {test.input_type === "select" && test.values?.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {test.values.map((opt) => (
                    <span key={`${test.key}-${opt.value}-${opt.display_value ?? opt.label}`} className="rounded-lg border border-aqua-deep/15 bg-aqua-soft px-3 py-2 text-xs font-medium text-aqua-deep">
                      {opt.display_value ?? opt.label}
                      {test.unit ? ` ${test.unit}` : ""}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <div className="min-h-[42px] flex-1 rounded-lg border border-aqua-deep/15 bg-white px-3 py-2 text-sm text-aqua-deep/45">Zahl eingeben</div>
                  {test.unit ? <span className="rounded-lg border border-aqua-deep/10 bg-aqua-soft px-3 py-2 text-xs font-medium text-aqua-deep/80">{test.unit}</span> : null}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-status-warning/30 bg-white px-3 py-2 text-sm text-aqua-deep/75">Keine aktiven Messwerte. Aktiviere mindestens einen Wassertest, bevor du den Entwurf aktivierst.</p>
        )}
      </div>
    </section>
  );
}

function TestEditorCard({
  test,
  readonly,
  onChange,
  onDelete,
}: {
  test: NonNullable<WaterTestConfigResponse["tests"]>[number];
  readonly: boolean;
  onChange: (test: NonNullable<WaterTestConfigResponse["tests"]>[number]) => void;
  onDelete: () => void;
}) {
  const disabled = readonly;
  const canDelete = !disabled && test.can_delete !== false;
  return (
    <article className="rounded-card border border-aqua-deep/10 bg-aqua-soft/40 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-aqua-deep">{test.label}</p>
          <p className="text-xs text-aqua-deep/60">Key: {test.key}</p>
        </div>
        <button
          type="button"
          disabled={!canDelete}
          onClick={onDelete}
          title={test.delete_blocked_reason ?? "Nur Entwürfe können angepasst werden."}
          className="rounded-button border border-status-critical/40 bg-white px-3 py-2 text-sm font-semibold text-status-critical disabled:opacity-50"
        >
          Wassertest löschen
        </button>
      </div>
      {test.can_delete === false && test.delete_blocked_reason ? (
        <p className="mb-3 rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs text-aqua-deep">
          {test.delete_blocked_reason}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="text-sm font-medium text-aqua-deep">Label<input disabled={disabled} value={test.label} onChange={(e) => onChange({ ...test, label: e.target.value })} className="mt-1 w-full rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" /></label>
        <label className="text-sm font-medium text-aqua-deep">Einheit<input disabled={disabled} value={test.unit} onChange={(e) => onChange({ ...test, unit: e.target.value })} className="mt-1 w-full rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" /></label>
        <label className="text-sm font-medium text-aqua-deep">Sortierung<input disabled={disabled} type="number" value={test.sort_order ?? 0} onChange={(e) => onChange({ ...test, sort_order: Number(e.target.value) })} className="mt-1 w-full rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" /></label>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium text-aqua-deep"><input disabled={disabled} type="checkbox" checked={test.is_active ?? true} onChange={(e) => onChange({ ...test, is_active: e.target.checked })} /> aktiv</label>
      </div>
      <EditableList title="Messwertoptionen" disabled={disabled} addLabel="Wert hinzufügen" items={test.values ?? []} onAdd={() => onChange({ ...test, values: [...(test.values ?? []), { value: 0, label: "0", display_value: "0", sort_order: (test.values?.length ?? 0) + 1 }] })} render={(item, i) => (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input aria-label="Wert" disabled={disabled} type="number" value={item.value} onChange={(e) => updateValue(i, { ...item, value: Number(e.target.value) })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <input aria-label="Anzeige" disabled={disabled} value={item.display_value ?? item.label ?? ""} onChange={(e) => updateValue(i, { ...item, display_value: e.target.value, label: e.target.value })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <button type="button" disabled={disabled} onClick={() => onChange({ ...test, values: test.values.filter((_, idx) => idx !== i) })} className="rounded-button border px-3 text-sm disabled:opacity-50">Löschen</button>
        </div>
      )} />
      <EditableList title="Warnschwellen" disabled={disabled} addLabel="Schwelle hinzufügen" items={test.thresholds ?? []} onAdd={() => onChange({ ...test, thresholds: [...(test.thresholds ?? []), { min_value: null, max_value: null, status: "watch", message: "", sort_order: (test.thresholds?.length ?? 0) + 1 }] })} render={(item, i) => (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[0.8fr_0.8fr_1fr_2fr_auto]">
          <input aria-label="Minimum" disabled={disabled} type="number" value={item.min_value ?? item.min ?? ""} onChange={(e) => updateThreshold(i, { ...item, min_value: nullableNumber(e.target.value), min: nullableNumber(e.target.value) })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <input aria-label="Maximum" disabled={disabled} type="number" value={item.max_value ?? item.max ?? ""} onChange={(e) => updateThreshold(i, { ...item, max_value: nullableNumber(e.target.value), max: nullableNumber(e.target.value) })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <select aria-label="Status" disabled={disabled} value={item.status} onChange={(e) => updateThreshold(i, { ...item, status: e.target.value })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5"><option value="ok">ok</option><option value="watch">watch</option><option value="critical">critical</option></select>
          <input aria-label="Nachricht" disabled={disabled} value={item.message} onChange={(e) => updateThreshold(i, { ...item, message: e.target.value })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <button type="button" disabled={disabled} onClick={() => onChange({ ...test, thresholds: (test.thresholds ?? []).filter((_, idx) => idx !== i) })} className="rounded-button border px-3 text-sm disabled:opacity-50">Löschen</button>
        </div>
      )} />
      <EditableList title="Timer" disabled={disabled} addLabel="Timer hinzufügen" items={test.timers ?? []} onAdd={() => onChange({ ...test, timers: [...(test.timers ?? []), { step_label: "Einwirkzeit", label: "Einwirkzeit", duration_seconds: 60, step_order: (test.timers?.length ?? 0) }] })} render={(item, i) => (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input aria-label="Timer-Schritt" disabled={disabled} value={item.step_label ?? item.label ?? ""} onChange={(e) => updateTimer(i, { ...item, step_label: e.target.value, label: e.target.value })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <input aria-label="Sekunden" disabled={disabled} type="number" value={item.duration_seconds} onChange={(e) => updateTimer(i, { ...item, duration_seconds: Number(e.target.value) })} className="rounded-button border border-aqua-deep/15 px-3 py-2 disabled:bg-aqua-deep/5" />
          <button type="button" disabled={disabled} onClick={() => onChange({ ...test, timers: (test.timers ?? []).filter((_, idx) => idx !== i) })} className="rounded-button border px-3 text-sm disabled:opacity-50">Löschen</button>
        </div>
      )} />
    </article>
  );

  function updateValue(i: number, next: NonNullable<typeof test.values>[number]) {
    const values = [...(test.values ?? [])];
    values[i] = next;
    onChange({ ...test, values });
  }
  function updateThreshold(i: number, next: NonNullable<typeof test.thresholds>[number]) {
    const thresholds = [...(test.thresholds ?? [])];
    thresholds[i] = next;
    onChange({ ...test, thresholds });
  }
  function updateTimer(i: number, next: NonNullable<typeof test.timers>[number]) {
    const timers = [...(test.timers ?? [])];
    timers[i] = next;
    onChange({ ...test, timers });
  }
}

function EditableList<T>({ title, disabled, addLabel, items, onAdd, render }: { title: string; disabled: boolean; addLabel: string; items: T[]; onAdd: () => void; render: (item: T, index: number) => ReactNode }) {
  return (
    <section className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-aqua-deep">{title}</h3>
        <button type="button" disabled={disabled} onClick={onAdd} className="rounded-button border border-aqua-blue px-3 py-1.5 text-xs font-semibold text-aqua-deep disabled:opacity-50">{addLabel}</button>
      </div>
      <div className="space-y-2">{items.length > 0 ? items.map((item, i) => <div key={i}>{render(item, i)}</div>) : <p className="text-xs text-aqua-deep/60">Keine Einträge.</p>}</div>
    </section>
  );
}

function nullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
