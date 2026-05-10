import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-white/10 bg-aqua-navy px-4 py-3 md:px-6 md:py-3.5">
      <Link
        href="/dashboard"
        className="flex min-h-12 min-w-0 max-w-full items-center rounded-md outline-none ring-offset-2 ring-offset-aqua-navy focus-visible:ring-2 focus-visible:ring-aqua-mint"
        aria-label="Dynalabs AquaDiag v1 – Zur Startseite"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/logo-header.png"
          alt="Dynalabs AquaDiag v1"
          width={1774}
          height={887}
          className="h-11 w-auto max-h-[52px] max-w-full shrink object-contain object-left sm:h-[52px]"
        />
      </Link>
    </header>
  );
}
