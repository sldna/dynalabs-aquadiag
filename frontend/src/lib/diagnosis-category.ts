/** Maps rule YAML `category` to short German UI labels. */
export function diagnosisCategoryLabelDE(category?: string | null): string | null {
  switch (category?.trim()) {
    case "water":
      return "Wasser / Chemie";
    case "disease":
      return "Krankheitshinweis";
    case "tank_algae":
      return "Becken / Algen";
    case "stress_husbandry":
      return "Stress / Haltung";
    default:
      return null;
  }
}
