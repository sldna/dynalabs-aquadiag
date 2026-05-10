import Link from "next/link";

/**
 * Top chrome: brand / logo (single instance per dashboard shell).
 */
export function AppHeader() {
  return (
    <header>
      <div className="flex items-center bg-aqua-navy px-4 py-3 md:px-6 md:py-3.5">
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
      </div>
    </header>
  );
}
