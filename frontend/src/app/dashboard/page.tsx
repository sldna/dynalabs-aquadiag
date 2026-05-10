import Link from "next/link";

import { BackendStatus } from "@/components/BackendStatus";
import { DashboardNav } from "@/components/DashboardNav";
import { Card, ContentGrid, PageContainer } from "@/components/layout";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <>
      <DashboardNav active="home" />
      <main id="main-content">
        <PageContainer className="flex min-h-0 flex-col gap-6 md:gap-8">
          <header className="space-y-2">
            <p className="text-sm font-medium text-aqua-deep">Dynalabs AquaDiag v1</p>
            <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep md:text-3xl">
              Dashboard
            </h1>
            <p className="max-w-prose text-sm text-aqua-deep/75 md:text-base">
              Schnelle Diagnose: Symptome oder Messwerte, dann handlungsorientiertes Ergebnis.
            </p>
          </header>

          <BackendStatus />

          <ContentGrid>
            <Link
              href="/dashboard/tanks"
              className="flex min-h-[120px] flex-col rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card outline-none ring-offset-2 ring-offset-aqua-soft transition-colors hover:border-aqua-blue/40 focus-visible:ring-2 focus-visible:ring-aqua-blue sm:p-5"
            >
              <h2 className="text-base font-semibold text-aqua-deep">Becken verwalten</h2>
              <p className="mt-2 text-sm text-aqua-deep/75">
                Neues Aquarium anlegen und bestehende Becken sehen.
              </p>
            </Link>
            <Link
              href="/dashboard/diagnose"
              className="flex min-h-[120px] flex-col rounded-card border border-aqua-blue/35 bg-aqua-soft p-4 shadow-card outline-none ring-offset-2 ring-offset-aqua-soft transition-colors hover:border-aqua-blue focus-visible:ring-2 focus-visible:ring-aqua-blue sm:p-5"
            >
              <h2 className="text-base font-semibold text-aqua-deep">Diagnose starten</h2>
              <p className="mt-2 text-sm text-aqua-deep/80">
                Symptome, Wasserwerte, Regeln auswerten.
              </p>
            </Link>
          </ContentGrid>

          <Card aria-label="Kurzüberblick">
            <h2 className="text-base font-semibold text-aqua-deep">Ablauf</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-aqua-deep/75">
              <li>Optional Becken unter „Becken“ anlegen</li>
              <li>Unter „Diagnose“ Messwerte und/oder Symptome eintragen</li>
              <li>Maßnahmen aus dem Ergebnis umsetzen</li>
            </ol>
          </Card>
        </PageContainer>
      </main>
    </>
  );
}
