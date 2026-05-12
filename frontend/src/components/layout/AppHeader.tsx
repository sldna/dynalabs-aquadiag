import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-white/10 bg-aqua-navy px-4 py-3 md:px-6 md:py-3.5">
      <Link
        href="/"
        className="flex min-h-12 min-w-0 max-w-full items-center gap-3 rounded-md outline-none ring-offset-2 ring-offset-aqua-navy focus-visible:ring-2 focus-visible:ring-aqua-mint sm:gap-3.5"
        aria-label="Dynalabs AquaDiag – Zur Startseite"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/logo-icon.svg"
          alt=""
          width={48}
          height={48}
          className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
          decoding="async"
        />
        <span className="min-w-0 truncate text-base font-semibold tracking-tight text-white sm:text-lg">
          Dynalabs AquaDiag
        </span>
      </Link>
    </header>
  );
}
