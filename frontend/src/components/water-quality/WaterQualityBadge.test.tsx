import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WaterQualityBadge } from "./WaterQualityBadge";

describe("WaterQualityBadge", () => {
  it("renders the German label for green", () => {
    render(<WaterQualityBadge status="green" />);
    const el = screen.getByTestId("water-quality-badge");
    expect(el).toHaveAttribute("data-status", "green");
    expect(el).toHaveTextContent(/Unauffällig/);
  });

  it("renders the German label for yellow", () => {
    render(<WaterQualityBadge status="yellow" />);
    expect(screen.getByTestId("water-quality-badge")).toHaveTextContent(
      /Beobachten/,
    );
  });

  it("renders the German label for red", () => {
    render(<WaterQualityBadge status="red" />);
    expect(screen.getByTestId("water-quality-badge")).toHaveTextContent(
      /Kritisch/,
    );
  });

  it("falls back to unknown for missing or invalid status", () => {
    render(<WaterQualityBadge status={undefined} />);
    const el = screen.getByTestId("water-quality-badge");
    expect(el).toHaveAttribute("data-status", "unknown");
    expect(el).toHaveTextContent(/Nicht bewertet/);
  });

  it("supports a custom visible label", () => {
    render(<WaterQualityBadge status="green" label="Alles ok" />);
    expect(screen.getByTestId("water-quality-badge")).toHaveTextContent(
      /Alles ok/,
    );
  });
});
