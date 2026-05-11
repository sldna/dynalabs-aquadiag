"use client";

import { useState } from "react";

import type { DiagnoseAPIResponse } from "@/lib/types";
import { openDiagnosisPdfExport } from "@/components/diagnosis/diagnosis-pdf-export";

type DiagnosisPdfExportButtonProps = {
  result: DiagnoseAPIResponse;
  tankSummaryLine: string | null;
  generatedAtLabel: string | null;
  diagnosisMetaLine: string | null;
};

export function DiagnosisPdfExportButton({
  result,
  tankSummaryLine,
  generatedAtLabel,
  diagnosisMetaLine,
}: DiagnosisPdfExportButtonProps) {
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-aqua-deep">Diagnose sichern</h3>
          <p className="mt-1 text-xs leading-relaxed text-aqua-deep/65">
            Erstellt eine druckoptimierte Ansicht mit Logo, Maßnahmen und Erklärung.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBlocked(false);
            const opened = openDiagnosisPdfExport({
              result,
              tankSummaryLine,
              generatedAtLabel,
              diagnosisMetaLine,
            });
            setBlocked(!opened);
          }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-button border border-aqua-blue bg-aqua-soft px-4 py-2.5 text-sm font-semibold text-aqua-deep hover:bg-white"
        >
          Als PDF exportieren
        </button>
      </div>
      {blocked ? (
        <p className="mt-3 text-xs text-status-critical" role="alert">
          Der Export konnte kein neues Fenster öffnen. Bitte Pop-ups für AquaDiag
          erlauben und erneut versuchen.
        </p>
      ) : null}
    </div>
  );
}
