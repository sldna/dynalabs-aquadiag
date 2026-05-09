import Link from "next/link";

import { BackendStatus } from "@/components/BackendStatus";
import { DashboardNav } from "@/components/DashboardNav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <>
      <DashboardNav active="home" />
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-8">
        <header className="space-y-2">
          <p className="text-sm font-medium text-aqua-deep">Dynalabs AquaDiag v1</p>
          <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep">
            Dashboard
          </h1>
          <p className="text-sm text-aqua-deep/75">
            Schnelle Diagnose: Symptome oder Messwerte, dann handlungsorientiertes Ergebnis.
          </p>
        </header>

        <BackendStatus />

        <div className="grid gap-3">
          <Link
            href="/dashboard/tanks"
            className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card transition-colors hover:border-aqua-blue/40"
          >
            <h2 className="text-sm font-semibold text-aqua-deep">
              Becken verwalten
            </h2>
            <p className="mt-1 text-sm text-aqua-deep/75">
              Neues Aquarium anlegen und bestehende Becken sehen.
            </p>
          </Link>
          <Link
            href="/dashboard/diagnose"
            className="rounded-card border border-aqua-blue/35 bg-aqua-soft p-4 shadow-card transition-colors hover:border-aqua-blue"
          >
            <h2 className="text-sm font-semibold text-aqua-deep">
              Diagnose starten
            </h2>
            <p className="mt-1 text-sm text-aqua-deep/80">
              Symptome, Wasserwerte, Regeln auswerten.
            </p>
          </Link>
        </div>

        <section
          className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
          aria-label="Kurzüberblick"
        >
          <h2 className="text-sm font-semibold text-aqua-deep">Ablauf</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-aqua-deep/75">
            <li>Optional Becken unter „Becken“ anlegen</li>
            <li>Unter „Diagnose“ Messwerte und/oder Symptome eintragen</li>
            <li>Maßnahmen aus dem Ergebnis umsetzen</li>
          </ol>
        </section>
      </main>
    </>
  );
}
