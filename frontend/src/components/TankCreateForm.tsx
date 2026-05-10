"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card } from "@/components/layout";
import { browserApiBase } from "@/lib/api-base";

export function TankCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [volume, setVolume] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const vol = volume.trim() === "" ? 0 : Number(volume.replace(",", "."));
    if (!name.trim()) {
      setError("Name eingeben.");
      return;
    }
    if (!Number.isFinite(vol) || vol < 0) {
      setError("Volumen: gültige Zahl (Liter) oder 0.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${browserApiBase()}/v1/tanks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), volume_liters: vol }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        setError(j?.message ?? `HTTP ${res.status}`);
        return;
      }
      setName("");
      setVolume("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" aria-labelledby="neues-becken-heading">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h2 id="neues-becken-heading" className="text-sm font-semibold text-aqua-deep">
        Neues Becken
      </h2>
      <label className="block text-sm text-aqua-deep/90">
        Name
        <input
          className="mt-1 w-full rounded-lg border border-aqua-deep/20 px-3 py-2 text-aqua-deep outline-none focus:ring-2 focus:ring-aqua-blue/40"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="off"
        />
      </label>
      <label className="block text-sm text-aqua-deep/90">
        Volumen (Liter, optional)
        <input
          inputMode="decimal"
          className="mt-1 w-full rounded-lg border border-aqua-deep/20 px-3 py-2 text-aqua-deep outline-none focus:ring-2 focus:ring-aqua-blue/40"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder="z. B. 180"
        />
      </label>
      {error && (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA] disabled:opacity-60"
      >
        {busy ? "Speichern…" : "Becken anlegen"}
      </button>
    </form>
    </Card>
  );
}
