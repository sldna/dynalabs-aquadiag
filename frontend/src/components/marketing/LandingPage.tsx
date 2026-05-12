import Link from "next/link";

import { DashboardFooter } from "@/components/DashboardFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/layout/Card";

const benefitCards = [
  {
    title: "Symptome zuerst",
    body: "Du beginnst mit dem, was du am Becken beobachtest — ohne Pflicht zu einer vollen Messreihe.",
  },
  {
    title: "Wasserwerte optional",
    body: "Messwerte schärfen die Einschätzung, sind aber nicht zwingend, wenn du gerade nichts messen kannst.",
  },
  {
    title: "Klare Sofortmaßnahmen",
    body: "Priorisierte Schritte („Jetzt tun“) und sinnvolle Optionen — damit du nicht raten musst.",
  },
  {
    title: "Unsicherheit sichtbar",
    body: "Konfidenz und Regel-Hinweise zeigen, wo die Datenlage dünn ist — ohne falsche Sicherheit.",
  },
] as const;

const flowSteps = [
  "Symptome auswählen",
  "Wasserwerte ergänzen, falls vorhanden",
  "Regelbasierte Einschätzung erhalten",
  "„Jetzt tun“ und „Vermeiden“ lesen",
] as const;

export function LandingPage() {
  return (
    <AppShell footer={<DashboardFooter />}>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 shadow-card">
          <AppHeader />
        </div>

        <main id="main-content" className="flex w-full flex-1 flex-col">
          {/* Hero */}
          <section
            className="w-full border-b border-aqua-deep/10 bg-gradient-to-b from-white via-aqua-soft to-aqua-soft"
            aria-labelledby="landing-hero-heading"
          >
            <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-10 sm:px-5 md:pb-16 md:pt-14 lg:px-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-aqua-blue">
                Dynalabs AquaDiag
              </p>
              <h1
                id="landing-hero-heading"
                className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-aqua-deep sm:text-4xl md:text-[2.5rem]"
              >
                Schnelle Einschätzung, wenn im Aquarium etwas nicht stimmt.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-aqua-deep/80 md:text-lg">
                AquaDiag hilft dir, Symptome und optionale Wasserwerte einzuordnen — mit klaren
                Sofortmaßnahmen, Unsicherheitshinweisen und Dingen, die du vermeiden solltest.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-aqua-deep/70">
                AquaDiag ist eine Entscheidungshilfe auf Basis fester Regeln — keine tierärztliche
                Garantie und kein Ersatz für Fachpersonal bei akuten Problemen.
              </p>

              <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/dashboard/diagnose"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-button bg-aqua-blue px-6 py-3 text-center text-base font-semibold text-white shadow-sm outline-none ring-offset-2 ring-offset-aqua-soft transition-colors hover:bg-[#168EAA] focus-visible:ring-2 focus-visible:ring-aqua-blue sm:w-auto sm:min-w-[200px]"
                >
                  Analyse starten
                </Link>
                <Link
                  href="/dashboard/tanks"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-button border-2 border-aqua-blue bg-white px-6 py-3 text-center text-base font-semibold text-aqua-deep outline-none ring-offset-2 ring-offset-aqua-soft transition-colors hover:bg-aqua-soft focus-visible:ring-2 focus-visible:ring-aqua-blue sm:w-auto sm:min-w-[200px]"
                >
                  Becken ansehen
                </Link>
              </div>
            </div>
          </section>

          {/* Nutzen */}
          <section
            className="w-full border-b border-aqua-deep/10 bg-white py-12 md:py-16"
            aria-labelledby="landing-benefits-heading"
          >
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-8">
              <h2
                id="landing-benefits-heading"
                className="text-xl font-semibold tracking-tight text-aqua-deep md:text-2xl"
              >
                Was AquaDiag dir bringt
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-aqua-deep/75 md:text-base">
                Fokus auf schnelle Orientierung — nicht auf endloses Logging.
              </p>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {benefitCards.map((card) => (
                  <Card key={card.title} className="flex flex-col border-aqua-deep/8">
                    <h3 className="text-base font-semibold text-aqua-deep">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-aqua-deep/75">{card.body}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Ablauf */}
          <section
            className="w-full border-b border-aqua-deep/10 bg-aqua-soft py-12 md:py-16"
            aria-labelledby="landing-flow-heading"
          >
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-8">
              <h2
                id="landing-flow-heading"
                className="text-xl font-semibold tracking-tight text-aqua-deep md:text-2xl"
              >
                So läuft es
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-aqua-deep/75 md:text-base">
                In wenigen Schritten von der Beobachtung zur strukturierten Einschätzung.
              </p>
              <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {flowSteps.map((label, index) => (
                  <li key={label}>
                    <Card className="flex h-full gap-3 border-aqua-deep/8 p-4 sm:p-5">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aqua-blue text-sm font-bold text-white"
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium leading-snug text-aqua-deep md:text-base">
                        {label}
                      </span>
                    </Card>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Trust / Safety */}
          <section
            className="w-full bg-white py-12 md:py-16"
            aria-labelledby="landing-trust-heading"
          >
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-5 lg:px-8">
              <h2
                id="landing-trust-heading"
                className="text-xl font-semibold tracking-tight text-aqua-deep md:text-2xl"
              >
                Verlässlichkeit und Sicherheit
              </h2>
              <div className="mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-aqua-deep/80 md:text-base">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="font-semibold text-aqua-deep">Deterministische Regelengine</strong>{" "}
                    wertet deine Eingaben nach festen YAML-Regeln aus — nachvollziehbar und reproduzierbar.
                  </li>
                  <li>
                    <strong className="font-semibold text-aqua-deep">Optional: KI-Erklärung</strong> — wenn
                    aktiviert, erklärt die KI das Ergebnis verständlich; sie erfindet keine Diagnosen und
                    überstimmt keine Regelergebnisse.
                  </li>
                  <li>
                    <strong className="font-semibold text-aqua-deep">Keine freien KI-Diagnosen</strong> — die
                    Einordnung kommt aus der Regelbasis, nicht aus einem offenen Chat.
                  </li>
                  <li>
                    Bei <strong className="font-semibold text-aqua-deep">akuten oder schweren Problemen</strong>{" "}
                    zieh Fachhandel, eine Tierarztpraxis mit Aquarienbezug oder sehr erfahrene Aquarianer
                    hinzu — AquaDiag ersetzt keine Vor-Ort-Hilfe.
                  </li>
                </ul>
              </div>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/dashboard/diagnose"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-button bg-aqua-blue px-6 py-3 text-center text-base font-semibold text-white shadow-sm outline-none ring-offset-2 ring-offset-white transition-colors hover:bg-[#168EAA] focus-visible:ring-2 focus-visible:ring-aqua-blue sm:w-auto sm:min-w-[200px]"
                >
                  Analyse starten
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-button border-2 border-aqua-blue bg-aqua-soft px-6 py-3 text-center text-base font-semibold text-aqua-deep outline-none ring-offset-2 ring-offset-white transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-aqua-blue sm:w-auto sm:min-w-[200px]"
                >
                  Zum Dashboard
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
