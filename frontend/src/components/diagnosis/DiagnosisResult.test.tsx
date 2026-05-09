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

