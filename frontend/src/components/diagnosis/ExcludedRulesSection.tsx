import type { ExcludedRule } from "@/lib/types";

function reasonDE(reason: string): string {
  switch (reason) {
    case "exclude_if":
      return "Ausschluss über Wasserbedingung";
    case "exclude_symptoms":
      return "Ausschluss durch Symptomkonflikt";
    default:
      return reason;
  }
}

export function ExcludedRulesSection({ rules }: { rules: ExcludedRule[] }) {
  const list = rules.filter((r) => r.rule_id?.trim());
  if (list.length === 0) return null;

  return (
    <section
      className="rounded-card bg-sand-neutral/50 p-4 ring-1 ring-aqua-deep/10"
      aria-label="Ausgeschlossene Regeln"
    >
      <h3 className="text-sm font-semibold text-aqua-deep">Ausgeschlossene Treffer</h3>
      <p className="mt-1 text-xs text-aqua-deep/65">
        Diese Regeln hätten teilweise gepasst, wurden aber deterministisch verworfen — zur Nachvollziehbarkeit.
      </p>
      <ul className="mt-3 space-y-2">
        {list.map((r) => (
          <li
            key={`${r.rule_id}-${r.reason}`}
            className="rounded-lg bg-white px-3 py-2 text-xs text-aqua-deep ring-1 ring-aqua-deep/8"
          >
            <span className="font-medium">{r.rule_id.trim()}</span>
            {r.diagnosis_type ? (
              <span className="text-aqua-deep/60"> · {r.diagnosis_type}</span>
            ) : null}
            <span className="mt-1 block text-aqua-deep/70">{reasonDE(r.reason)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
