"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { browserApiBase } from "@/lib/api-base";

export type DeleteTankDialogProps = {
  tankId: number;
  tankName: string;
};

type ApiError = {
  message?: string;
};

export function DeleteTankDialog({ tankId, tankName }: DeleteTankDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function onConfirm() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${browserApiBase()}/v1/tanks/${tankId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const j = (await res.json().catch(() => null)) as ApiError | null;
        setError(j?.message ?? `HTTP ${res.status}`);
        return;
      }
      const params = new URLSearchParams({ deleted: tankName });
      router.push(`/dashboard/tanks?${params.toString()}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="w-full rounded-button border border-status-critical/45 bg-white px-4 py-3 text-sm font-semibold text-status-critical hover:bg-status-critical/10"
      >
        Becken löschen
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-aqua-navy/50 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (busy) return;
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md rounded-card bg-white p-5 shadow-card"
          >
            <h2
              id={titleId}
              className="text-base font-semibold text-aqua-deep"
            >
              Becken „{tankName}“ wirklich löschen?
            </h2>
            <p id={descId} className="mt-3 text-sm text-aqua-deep/85">
              Diese Aktion kann nicht rückgängig gemacht werden. Mit dem Becken
              werden auch alle zugehörigen Messungen und Diagnosen unwiderruflich
              entfernt.
            </p>
            {error ? (
              <p className="mt-3 text-sm text-status-critical" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-button border border-aqua-blue bg-white px-4 py-3 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft disabled:opacity-60 sm:w-auto"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className="rounded-button bg-status-critical px-4 py-3 text-sm font-semibold text-white hover:bg-status-critical/90 disabled:opacity-60 sm:w-auto"
              >
                {busy ? "Lösche…" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
