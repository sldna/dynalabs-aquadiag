import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DiagnosisResult } from "./DiagnosisResult";

const noopSave = vi.fn().mockResolvedValue(undefined);
const noopReanalyze = vi.fn().mockResolvedValue(undefined);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DiagnosisResult unknown state", () => {
  it("renders dedicated unknown-state UI when status is unknown", () => {
    render(
      <DiagnosisResult
        result={{ status: "unknown" }}
        tankSummaryLine={null}
        saveFollowUpAnswers={noopSave}
        onReanalyzeWithFollowUps={noopReanalyze}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Keine eindeutige Diagnose möglich" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Bitte weitere Werte prüfen" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Möglicherweise fehlen Angaben" }),
    ).toBeInTheDocument();

    expect(screen.getByText(/Nitrit messen/i)).toBeInTheDocument();
    expect(screen.getByText(/^pH messen$/i)).toBeInTheDocument();
    expect(screen.getByText(/Fischverhalten beschreiben/i)).toBeInTheDocument();
    expect(
      screen.getByText(/später mehr hinzufügen/i),
    ).toBeInTheDocument();
  });

  it("renders a retry button and calls onRetry", async () => {
    const onRetry = vi.fn();

    render(
      <DiagnosisResult
        result={{ status: "unknown" }}
        tankSummaryLine={null}
        saveFollowUpAnswers={noopSave}
        onReanalyzeWithFollowUps={noopReanalyze}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Neue Analyse" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("DiagnosisResult AI explanation", () => {
  it("renders AI-Erklärung when ai_explanation exists", () => {
    render(
      <DiagnosisResult
        result={{
          status: "matched",
          top_diagnosis: {
            rule_id: "r1",
            name: "Test",
            diagnosis_type: "x",
            severity: "low",
            confidence: 0.5,
            summary_de: "S",
            reasoning_de: "R",
            actions_now: ["A"],
            actions_optional: ["B"],
            avoid: ["C"],
            follow_up_questions_de: [],
            safety_note_de: "",
            facts: [],
          },
          diagnoses: [
            {
              rule_id: "r1",
              name: "Test",
              diagnosis_type: "x",
              severity: "low",
              confidence: 0.5,
              summary_de: "S",
              reasoning_de: "R",
              actions_now: ["A"],
              actions_optional: ["B"],
              avoid: ["C"],
              follow_up_questions_de: [],
              safety_note_de: "",
              facts: [],
            },
          ],
          matched_rules: ["r1"],
          ai_explanation: {
            summary: "AI summary",
            reasoning_public: "AI reasoning",
            actions_now: [],
            actions_optional: [],
            avoid: [],
            follow_up_questions: [],
            safety_note: "AI safety",
          },
          meta: {
            rule_engine_version: "1",
            evaluated_rules: 1,
            matched_count: 1,
            generated_at: "2026-05-09T07:00:00Z",
            ai_status: "ok",
            diagnosis_id: 1,
            water_test_id: 1,
            tank_id: 1,
          },
        }}
        tankSummaryLine="Aquarium · 120 l"
        saveFollowUpAnswers={noopSave}
        onReanalyzeWithFollowUps={noopReanalyze}
      />,
    );

    expect(screen.getByText("AI-Erklärung (optional)")).toBeInTheDocument();
    expect(
      screen.getByText(/Die KI ergänzt die regelbasierte Analyse/),
    ).toBeInTheDocument();
    expect(screen.getByText(/AI summary/)).toBeInTheDocument();
  });
});

describe("DiagnosisResult follow-ups", () => {
  it("renders labeled textareas for follow-up questions", () => {
    render(
      <DiagnosisResult
        result={{
          status: "matched",
          top_diagnosis: {
            rule_id: "r1",
            name: "Test",
            diagnosis_type: "x",
            severity: "low",
            confidence: 0.5,
            summary_de: "S",
            reasoning_de: "R",
            actions_now: ["A"],
            actions_optional: ["B"],
            avoid: ["C"],
            follow_up_questions_de: ["Wie oft wechselst du Wasser?", "Welche Fische?"],
            safety_note_de: "",
            facts: [],
          },
          diagnoses: [
            {
              rule_id: "r1",
              name: "Test",
              diagnosis_type: "x",
              severity: "low",
              confidence: 0.5,
              summary_de: "S",
              reasoning_de: "R",
              actions_now: ["A"],
              actions_optional: ["B"],
              avoid: ["C"],
              follow_up_questions_de: ["Wie oft wechselst du Wasser?", "Welche Fische?"],
              safety_note_de: "",
              facts: [],
            },
          ],
          matched_rules: ["r1"],
          meta: {
            rule_engine_version: "1",
            evaluated_rules: 1,
            matched_count: 1,
            generated_at: "2026-05-09T07:00:00Z",
            ai_status: "disabled",
            diagnosis_id: 9,
            water_test_id: 2,
            tank_id: 3,
          },
        }}
        tankSummaryLine="Beta · 90 l"
        saveFollowUpAnswers={noopSave}
        onReanalyzeWithFollowUps={noopReanalyze}
      />,
    );

    expect(screen.getByLabelText(/Wie oft wechselst du Wasser/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Welche Fische/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Antworten speichern" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyse mit Antworten aktualisieren" }),
    ).toBeInTheDocument();
  });

  it("shows tank context line when tankSummaryLine is set", () => {
    render(
      <DiagnosisResult
        result={{
          status: "matched",
          top_diagnosis: {
            rule_id: "r1",
            name: "Test",
            diagnosis_type: "x",
            severity: "low",
            confidence: 0.5,
            summary_de: "S",
            reasoning_de: "R",
            actions_now: [],
            actions_optional: [],
            avoid: [],
            follow_up_questions_de: [],
            safety_note_de: "",
            facts: [],
          },
          diagnoses: [
            {
              rule_id: "r1",
              name: "Test",
              diagnosis_type: "x",
              severity: "low",
              confidence: 0.5,
              summary_de: "S",
              reasoning_de: "R",
              actions_now: [],
              actions_optional: [],
              avoid: [],
              follow_up_questions_de: [],
              safety_note_de: "",
              facts: [],
            },
          ],
          matched_rules: ["r1"],
          meta: {
            rule_engine_version: "1",
            evaluated_rules: 1,
            matched_count: 1,
            generated_at: "2026-05-09T12:00:00Z",
            ai_status: "disabled",
            diagnosis_id: 1,
            water_test_id: 1,
            tank_id: 1,
          },
        }}
        tankSummaryLine="Gamma · 60 l"
        saveFollowUpAnswers={noopSave}
        onReanalyzeWithFollowUps={noopReanalyze}
      />,
    );

    expect(screen.getByText(/Analyse für:/i)).toBeInTheDocument();
    expect(screen.getByText(/Gamma · 60 l/)).toBeInTheDocument();
    expect(screen.getByText(/Stand:/i)).toBeInTheDocument();
  });
});

describe("DiagnosisResult PDF export", () => {
  it("opens a print export with the AquaDiag logo and diagnosis content", () => {
    const written: string[] = [];
    const printWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn((html: string) => written.push(html)),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      setTimeout: vi.fn((callback: () => void) => callback()),
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(printWindow);

    render(
      <DiagnosisResult
        result={{
          status: "matched",
          top_diagnosis: {
            rule_id: "nitrite_poisoning_v1",
            name: "Nitrit erhöht",
            diagnosis_type: "nitrite_poisoning",
            severity: "critical",
            confidence: 0.86,
            summary_de: "Nitrit ist stark erhöht.",
            reasoning_de: "Der Nitritwert liegt über dem Grenzwert.",
            actions_now: ["Teilwasserwechsel durchführen"],
            actions_optional: ["Fütterung reduzieren"],
            avoid: ["Keine hektischen Extremmaßnahmen"],
            follow_up_questions_de: [],
            safety_note_de: "Becken weiter beobachten.",
            facts: [],
            matched_water_values: [
              {
                field: "nitrite_mg_l",
                label_de: "Nitrit",
                value: 0.4,
                unit: "mg/l",
              },
            ],
          },
          diagnoses: [
            {
              rule_id: "nitrite_poisoning_v1",
              name: "Nitrit erhöht",
              diagnosis_type: "nitrite_poisoning",
              severity: "critical",
              confidence: 0.86,
              summary_de: "Nitrit ist stark erhöht.",
              reasoning_de: "Der Nitritwert liegt über dem Grenzwert.",
              actions_now: ["Teilwasserwechsel durchführen"],
              actions_optional: ["Fütterung reduzieren"],
              avoid: ["Keine hektischen Extremmaßnahmen"],
              follow_up_questions_de: [],
              safety_note_de: "Becken weiter beobachten.",
              facts: [],
            },
          ],
          matched_rules: ["nitrite_poisoning_v1"],
          meta: {
            rule_engine_version: "1",
            evaluated_rules: 1,
            matched_count: 1,
            generated_at: "2026-05-09T07:00:00Z",
            ai_status: "disabled",
            diagnosis_id: 7,
            water_test_id: 8,
            tank_id: 9,
          },
        }}
        tankSummaryLine="Wohnzimmer · 180 l"
        saveFollowUpAnswers={noopSave}
        onReanalyzeWithFollowUps={noopReanalyze}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Als PDF exportieren" }));

    expect(window.open).toHaveBeenCalledWith("", "_blank", "width=920,height=1200");
    expect(written).toHaveLength(1);
    expect(written[0]).toContain("/logos/logo-full.svg");
    expect(written[0]).toContain("Dynalabs AquaDiag v1 Logo");
    expect(written[0]).toContain("Teilwasserwechsel durchführen");
    expect(written[0]).toContain("Nitrit");
    expect(printWindow.print).toHaveBeenCalled();
  });
});
