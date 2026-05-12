/**
 * Global dashboard footer (CD: Deep Navy, Claim im About-/Footer-Bereich).
 */
export function DashboardFooter() {
  return (
    <footer
      className="mt-auto border-t border-white/10 bg-aqua-navy px-4 py-8 text-white md:px-6"
      role="contentinfo"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
        <p className="text-sm font-semibold leading-snug">
          Dynalabs AquaDiag v1
        </p>
        <p className="text-sm font-normal leading-relaxed text-white/85">
          Aquarienwerte verstehen. Probleme früh erkennen.
        </p>
        <p className="text-xs leading-relaxed text-white/65">
          Entscheidungshilfe für Aquarianer — keine tierärztliche Beratung.
        </p>
      </div>
    </footer>
  );
}
