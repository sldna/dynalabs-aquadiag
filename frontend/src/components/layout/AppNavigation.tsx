import Link from "next/link";

export type NavActiveKey = "home" | "tanks" | "diagnose";

const inactiveLink =
  "inline-flex min-h-[44px] items-center justify-center rounded-button border border-aqua-blue/35 bg-white px-3 py-2 text-sm font-semibold text-aqua-deep shadow-sm outline-none ring-offset-2 ring-offset-white transition-colors hover:border-aqua-blue hover:bg-aqua-soft focus-visible:ring-2 focus-visible:ring-aqua-blue";

const activeLink =
  "inline-flex min-h-[44px] items-center justify-center rounded-button border border-aqua-blue bg-aqua-soft px-3 py-2 text-sm font-semibold text-aqua-deep shadow-sm outline-none ring-2 ring-aqua-blue/35 ring-offset-2 ring-offset-white";

export function AppNavigation({ active }: { active: NavActiveKey }) {
  return (
    <nav
      className="flex flex-wrap items-center gap-2 border-b border-aqua-deep/10 bg-white/95 px-4 py-3 backdrop-blur-sm sm:gap-3"
      aria-label="Hauptnavigation"
    >
      <Link href="/dashboard" className={active === "home" ? activeLink : inactiveLink}>
        Start
      </Link>
      <Link href="/dashboard/tanks" className={active === "tanks" ? activeLink : inactiveLink}>
        Becken
      </Link>
      <Link href="/dashboard/diagnose" className={active === "diagnose" ? activeLink : inactiveLink}>
        Diagnose
      </Link>
    </nav>
  );
}
