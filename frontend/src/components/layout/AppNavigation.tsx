"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "rounded-button border border-aqua-blue/35 bg-white px-3 py-2 text-sm font-semibold text-aqua-deep shadow-sm transition-colors hover:border-aqua-blue hover:bg-aqua-soft";
const activeClass =
  "rounded-button border border-aqua-blue bg-aqua-soft px-3 py-2 text-sm font-semibold text-aqua-deep shadow-sm ring-1 ring-aqua-blue/40";

function navActive(pathname: string): "home" | "tanks" | "diagnose" {
  if (pathname.startsWith("/dashboard/diagnose")) return "diagnose";
  if (pathname.startsWith("/dashboard/tanks")) return "tanks";
  return "home";
}

export function AppNavigation() {
  const pathname = usePathname() ?? "/dashboard";
  const active = navActive(pathname);

  return (
    <nav
      className="flex flex-wrap items-center gap-2 border-b border-aqua-deep/10 bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6"
      aria-label="Hauptnavigation"
    >
      <Link href="/dashboard" className={active === "home" ? activeClass : linkClass}>
        Start
      </Link>
      <Link href="/dashboard/tanks" className={active === "tanks" ? activeClass : linkClass}>
        Becken
      </Link>
      <Link
        href="/dashboard/diagnose"
        className={active === "diagnose" ? activeClass : linkClass}
      >
        Diagnose
      </Link>
    </nav>
  );
}
