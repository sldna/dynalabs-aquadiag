"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { browserApiBase } from "@/lib/api-base";
import type { Tank } from "@/lib/types";

export type TankEditFormProps = {
  tank: Tank;
};

type ApiError = {
  message?: string;
  errors?: Array<{ field?: string; message?: string }>;
};

function buildPayload(
  initial: Tank,
  name: string,
  volume: string,
  notes: string,
): { payload: Record<string, unknown>; volumeError: string | null } {
  const payload: Record<string, unknown> = {};

  const trimmedName = name.trim();
  if (trimmedName !== initial.name) {
    payload.name = trimmedName;
  }

  let volumeError: string | null = null;
  const trimmedVolume = volume.trim();
  if (trimmedVolume === "") {
    if (initial.volume_liters !== 0) {
      payload.volume_liters = 0;
    }
  } else {
    const v = Number(trimmedVolume.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) {
      volumeError = "Volumen: gültige Zahl (Liter) oder leer.";
    } else if (v !== initial.volume_liters) {
      payload.volume_liters = v;
    }
  }

  const trimmedNotes = notes.trim();
  const initialNotes = (initial.notes ?? "").trim();
  if (trimmedNotes !== initialNotes) {
    payload.notes = trimmedNotes === "" ? null : trimmedNotes;
  }

  return { payload, volumeError };
}

export function TankEditForm({ tank }: TankEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(tank.name);
  const [volume, setVolume] = useState(
    tank.volume_liters === 0 ? "" : String(tank.volume_liters),
  );
  const [notes, setNotes] = useState(tank.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name eingeben.");
      return;
    }

    const { payload, volumeError } = buildPayload(tank, name, volume, notes);
    if (volumeError) {
      setError(volumeError);
      return;
    }

    if (Object.keys(payload).length === 0) {
      router.push(`/dashboard/tanks/${tank.id}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${browserApiBase()}/v1/tanks/${tank.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as ApiError | null;
        const fieldMsg = j?.errors?.[0]?.message;
        setError(fieldMsg ?? j?.message ?? `HTTP ${res.status}`);
        return;
      }
      router.push(`/dashboard/tanks/${tank.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={busy}
      className="flex flex-col gap-3 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
    >
      <h2 className="text-sm font-semibold text-aqua-deep">Becken bearbeiten</h2>
      <label className="block text-sm text-aqua-deep/90">
        Name
        <input
          className="mt-1 w-full rounded-lg border border-aqua-deep/20 px-3 py-2 text-aqua-deep outline-none focus:ring-2 focus:ring-aqua-blue/40 disabled:opacity-60"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          autoComplete="off"
          required
        />
      </label>
      <label className="block text-sm text-aqua-deep/90">
        Volumen (Liter, optional)
        <input
          inputMode="decimal"
          className="mt-1 w-full rounded-lg border border-aqua-deep/20 px-3 py-2 text-aqua-deep outline-none focus:ring-2 focus:ring-aqua-blue/40 disabled:opacity-60"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          disabled={busy}
          placeholder="z. B. 180"
        />
      </label>
      <label className="block text-sm text-aqua-deep/90">
        Notizen (optional)
        <textarea
          className="mt-1 min-h-[6rem] w-full rounded-lg border border-aqua-deep/20 px-3 py-2 text-aqua-deep outline-none focus:ring-2 focus:ring-aqua-blue/40 disabled:opacity-60"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={busy}
          placeholder="z. B. Besatz, Filter, Pflanzen"
        />
      </label>
      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/tanks/${tank.id}`)}
          disabled={busy}
          className="flex-1 rounded-button border border-aqua-blue bg-white px-4 py-3 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft disabled:opacity-60"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
        >
          {busy ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
