import Link from "next/link";

const linkClass =
  "rounded-button border border-aqua-blue/35 bg-white px-3 py-2 text-sm font-semibold text-aqua-deep shadow-sm transition-colors hover:border-aqua-blue hover:bg-aqua-soft";
const activeClass =
  "rounded-button border border-aqua-blue bg-aqua-soft px-3 py-2 text-sm font-semibold text-aqua-deep shadow-sm ring-1 ring-aqua-blue/40";

export function DashboardNav({ active }: { active: "home" | "tanks" | "diagnose" }) {
  return (
    <div className="sticky top-0 z-40 shadow-card">
      <header className="flex items-center bg-aqua-navy px-4 py-3 md:px-6 md:py-3.5">
        <Link
          href="/dashboard"
          className="flex min-h-12 min-w-0 max-w-full items-center"
          aria-label="Dynalabs AquaDiag v1 – Zur Startseite"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/logo-header.png"
            alt="Dynalabs AquaDiag v1"
            width={1774}
            height={887}
            className="h-12 w-auto max-h-[56px] max-w-full shrink object-contain object-left sm:h-[52px]"
          />
        </Link>
      </header>
      <nav
        className="flex flex-wrap items-center gap-2 border-b border-aqua-deep/10 bg-white/95 px-4 py-3 backdrop-blur-sm"
        aria-label="Hauptnavigation"
      >
        <Link
          href="/dashboard"
          className={active === "home" ? activeClass : linkClass}
        >
          Start
        </Link>
        <Link
          href="/dashboard/tanks"
          className={active === "tanks" ? activeClass : linkClass}
        >
          Becken
        </Link>
        <Link
          href="/dashboard/diagnose"
          className={active === "diagnose" ? activeClass : linkClass}
        >
          Diagnose
        </Link>
      </nav>
    </div>
  );
}
