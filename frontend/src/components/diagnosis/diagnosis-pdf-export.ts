import { diagnosisDisplayName } from "@/components/diagnosis/diagnosis-display-name";
import type { DiagnoseAPIResponse, DiagnosisItem, WaterValueSignal } from "@/lib/types";
import { diagnosisCategoryLabelDE } from "@/lib/diagnosis-category";
import { severityLabelDE } from "@/lib/severity";
import { symptomLabelDE } from "@/lib/symptom-labels";

type DiagnosisExportInput = {
  result: DiagnoseAPIResponse;
  tankSummaryLine: string | null;
  generatedAtLabel: string | null;
  diagnosisMetaLine: string | null;
  logoSrc: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pickTop(result: DiagnoseAPIResponse): DiagnosisItem | null {
  if ("top_diagnosis" in result && result.top_diagnosis) return result.top_diagnosis;
  const diagnoses = "diagnoses" in result ? result.diagnoses ?? [] : [];
  return diagnoses[0] ?? null;
}

function withoutTop(all: DiagnosisItem[], top: DiagnosisItem | null): DiagnosisItem[] {
  if (!top) return all;
  return all.filter((d) => d.rule_id !== top.rule_id);
}

function formatConfidence(confidence: number): string {
  if (!Number.isFinite(confidence)) return "nicht bewertet";
  return `${Math.round(Math.min(1, Math.max(0, confidence)) * 100)} %`;
}

function renderList(title: string, items: string[] | undefined): string {
  const clean = items?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (clean.length === 0) return "";
  return `
    <section class="section">
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${clean.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </section>
  `;
}

function renderWaterValues(values: WaterValueSignal[] | undefined): string {
  if (!values?.length) return "";
  return `
    <section class="section">
      <h3>Relevante Wasserwerte</h3>
      <dl class="values">
        ${values
          .map(
            (w) => `
              <div>
                <dt>${escapeHtml(w.label_de)}</dt>
                <dd>${escapeHtml(w.value)}${w.unit ? ` ${escapeHtml(w.unit)}` : ""}</dd>
              </div>
            `,
          )
          .join("")}
      </dl>
    </section>
  `;
}

function renderDiagnosisSummary(diagnosis: DiagnosisItem): string {
  const category = diagnosisCategoryLabelDE(diagnosis.category);
  const symptoms =
    diagnosis.matched_symptoms?.map((s) => symptomLabelDE(s).trim()).filter(Boolean) ?? [];
  const conditions = diagnosis.matched_conditions?.filter((s) => s.trim()) ?? [];

  return `
    <article class="diagnosis">
      <p class="eyebrow">Hauptdiagnose</p>
      <h2>${escapeHtml(diagnosisDisplayName(diagnosis))}</h2>
      <div class="meta-row">
        <span class="badge">${escapeHtml(severityLabelDE(String(diagnosis.severity)))}</span>
        <span>Konfidenz ${escapeHtml(formatConfidence(diagnosis.confidence))}</span>
        ${category ? `<span>${escapeHtml(category)}</span>` : ""}
      </div>
      ${
        diagnosis.summary_de?.trim()
          ? `<p class="lead">${escapeHtml(diagnosis.summary_de.trim())}</p>`
          : ""
      }
      ${
        diagnosis.uncertainty_note_de?.trim()
          ? `<p class="note">${escapeHtml(diagnosis.uncertainty_note_de.trim())}</p>`
          : ""
      }

      ${renderList("Jetzt tun", diagnosis.actions_now)}
      ${renderList("Optional", diagnosis.actions_optional)}
      ${renderList("Vermeiden", diagnosis.avoid)}
      ${
        diagnosis.safety_note_de?.trim()
          ? `<section class="section"><h3>Hinweis</h3><p>${escapeHtml(
              diagnosis.safety_note_de.trim(),
            )}</p></section>`
          : ""
      }
      ${renderWaterValues(diagnosis.matched_water_values)}
      ${renderList("Regel-Zusammenhang", conditions)}
      ${renderList("Relevante Symptome", symptoms)}
      ${
        diagnosis.reasoning_de?.trim()
          ? `<section class="section"><h3>Erklärung</h3><p>${escapeHtml(
              diagnosis.reasoning_de.trim(),
            )}</p></section>`
          : ""
      }
    </article>
  `;
}

function renderAdditionalDiagnoses(diagnoses: DiagnosisItem[]): string {
  if (diagnoses.length === 0) return "";
  return `
    <section class="section page-break-avoid">
      <h2>Weitere mögliche Ursachen</h2>
      ${diagnoses
        .map(
          (d) => `
            <article class="compact-diagnosis">
              <h3>${escapeHtml(diagnosisDisplayName(d))}</h3>
              <p>${escapeHtml(severityLabelDE(String(d.severity)))} · Konfidenz ${escapeHtml(
                formatConfidence(d.confidence),
              )}</p>
              ${renderList("Jetzt tun", d.actions_now)}
            </article>
          `,
        )
        .join("")}
    </section>
  `;
}

export function buildDiagnosisPdfExportHtml({
  result,
  tankSummaryLine,
  generatedAtLabel,
  diagnosisMetaLine,
  logoSrc,
}: DiagnosisExportInput): string {
  const top = result.status === "matched" ? pickTop(result) : null;
  const diagnoses = result.status === "matched" ? result.diagnoses ?? [] : [];
  const additional = withoutTop(diagnoses, top);

  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AquaDiag Diagnose Export</title>
  <style>
    :root {
      --aqua-deep: #0F4C5C;
      --aqua-blue: #1CA7C9;
      --aqua-soft: #E8F8FB;
      --deep-navy: #082F3A;
      --sand: #F4EFE7;
      --warning: #F2C94C;
      --critical: #EB5757;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--aqua-deep);
      background: white;
      font-family: Inter, "Source Sans 3", Arial, sans-serif;
      line-height: 1.5;
    }
    main {
      max-width: 820px;
      margin: 0 auto;
      padding: 32px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 3px solid var(--aqua-blue);
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .brand img {
      display: block;
      height: 52px;
      width: auto;
      max-width: 260px;
    }
    .brand-title {
      color: var(--deep-navy);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .context {
      display: grid;
      gap: 6px;
      margin-bottom: 24px;
      border-radius: 16px;
      background: var(--aqua-soft);
      padding: 16px;
    }
    .context p,
    .section p,
    .compact-diagnosis p {
      margin: 0;
    }
    h1 {
      margin: 0 0 8px;
      color: var(--deep-navy);
      font-size: 28px;
      line-height: 1.2;
    }
    h2 {
      margin: 0;
      color: var(--deep-navy);
      font-size: 22px;
      line-height: 1.25;
    }
    h3 {
      margin: 0 0 8px;
      color: var(--aqua-deep);
      font-size: 15px;
    }
    ul {
      margin: 0;
      padding-left: 22px;
    }
    li + li {
      margin-top: 4px;
    }
    .diagnosis {
      border-left: 6px solid var(--aqua-blue);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 8px 24px rgba(8, 47, 58, 0.08);
      padding: 22px;
    }
    .eyebrow {
      margin: 0 0 6px;
      color: rgba(15, 76, 92, 0.68);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
    }
    .meta-row span,
    .badge {
      border-radius: 999px;
      background: var(--aqua-soft);
      padding: 5px 10px;
    }
    .badge {
      background: rgba(242, 201, 76, 0.32);
      color: var(--deep-navy);
    }
    .lead {
      margin-top: 18px;
      font-size: 15px;
    }
    .note {
      margin-top: 14px;
      border: 1px solid rgba(242, 201, 76, 0.65);
      border-radius: 12px;
      background: rgba(242, 201, 76, 0.14);
      padding: 10px 12px;
    }
    .section {
      margin-top: 20px;
      border-radius: 14px;
      background: var(--aqua-soft);
      padding: 16px;
      break-inside: avoid;
    }
    .values {
      display: grid;
      gap: 8px;
      margin: 0;
    }
    .values div {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid rgba(15, 76, 92, 0.12);
      padding-bottom: 7px;
    }
    .values div:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .values dt {
      font-weight: 700;
    }
    .values dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
    .compact-diagnosis {
      margin-top: 12px;
      border-radius: 12px;
      background: white;
      padding: 14px;
    }
    .footer {
      margin-top: 28px;
      border-top: 1px solid rgba(15, 76, 92, 0.16);
      padding-top: 14px;
      color: rgba(15, 76, 92, 0.72);
      font-size: 12px;
    }
    .print-action {
      margin: 0 auto 18px;
      max-width: 820px;
      padding: 16px 32px 0;
      text-align: right;
    }
    .print-action button {
      border: 0;
      border-radius: 12px;
      background: var(--aqua-blue);
      color: white;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 10px 16px;
    }
    @media print {
      .print-action { display: none; }
      main { padding: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 18mm; }
    }
  </style>
</head>
<body>
  <div class="print-action">
    <button type="button" onclick="window.print()">PDF speichern / drucken</button>
  </div>
  <main>
    <header class="brand">
      <img src="${escapeHtml(logoSrc)}" alt="Dynalabs AquaDiag v1 Logo" />
      <div>
        <p class="brand-title">Dynalabs AquaDiag v1</p>
        <h1>Diagnose-Export</h1>
      </div>
    </header>

    <section class="context" aria-label="Diagnose-Kontext">
      ${tankSummaryLine ? `<p><strong>Analyse für:</strong> ${escapeHtml(tankSummaryLine)}</p>` : ""}
      ${generatedAtLabel ? `<p><strong>Stand:</strong> ${escapeHtml(generatedAtLabel)}</p>` : ""}
      ${diagnosisMetaLine ? `<p>${escapeHtml(diagnosisMetaLine)}</p>` : ""}
    </section>

    ${
      top
        ? `${renderDiagnosisSummary(top)}${renderAdditionalDiagnoses(additional)}`
        : `<section class="section"><h2>Keine eindeutige Diagnose möglich</h2><p>Mit den aktuellen Angaben lässt sich keine zuverlässige Zuordnung treffen.</p></section>`
    }

    <p class="footer">
      AquaDiag ist eine regelbasierte Entscheidungshilfe und ersetzt keine fachkundige Beratung vor Ort.
      Empfehlungen stützen sich auf die eingegebenen Daten.
    </p>
  </main>
</body>
</html>`;
}

export function openDiagnosisPdfExport(input: Omit<DiagnosisExportInput, "logoSrc">): boolean {
  const logoSrc = `${window.location.origin}/logos/logo-full.svg`;
  const html = buildDiagnosisPdfExportHtml({ ...input, logoSrc });
  const printWindow = window.open("", "_blank", "width=920,height=1200");

  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => {
    printWindow.print();
  }, 300);

  return true;
}
