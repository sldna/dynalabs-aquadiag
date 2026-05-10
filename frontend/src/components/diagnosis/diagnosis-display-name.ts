import type { DiagnosisItem } from "@/lib/types";

export function diagnosisDisplayName(d: DiagnosisItem): string {
  const n = d.name?.trim();
  if (n) return n;
  return d.diagnosis_type.replace(/_/g, " ");
}
