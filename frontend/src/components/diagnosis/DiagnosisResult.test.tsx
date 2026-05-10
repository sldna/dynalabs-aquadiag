import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DiagnosisResult } from "./DiagnosisResult";

describe("DiagnosisResult unknown state", () => {
  it("renders dedicated unknown-state UI when status is unknown", () => {
    render(<DiagnosisResult result={{ status: "unknown" }} />);

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

    render(<DiagnosisResult result={{ status: "unknown" }} onRetry={onRetry} />);

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
      />,
    );

    expect(screen.getByText("AI-Erklärung (optional)")).toBeInTheDocument();
    expect(
      screen.getByText(/Die KI ergänzt die regelbasierte Analyse/),
    ).toBeInTheDocument();
    expect(screen.getByText(/AI summary/)).toBeInTheDocument();
  });
});

