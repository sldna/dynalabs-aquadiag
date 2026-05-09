import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TankCard } from "./TankCard";

const baseTank = {
  id: 7,
  name: "Wohnzimmer",
  volume_liters: 180,
  created_at: "2026-05-01T08:00:00Z",
};

describe("TankCard", () => {
  it("links to the detail page and shows name and volume", () => {
    render(<TankCard tank={baseTank} />);
    const link = screen.getByRole("link", { name: /Wohnzimmer/i });
    expect(link).toHaveAttribute("href", "/dashboard/tanks/7");
    expect(screen.getByText(/180 l/)).toBeInTheDocument();
    expect(screen.getByText(/ID 7/)).toBeInTheDocument();
  });

  it("shows the empty hint when there is no measurement", () => {
    render(<TankCard tank={baseTank} />);
    expect(screen.getByText(/Noch keine Messungen/)).toBeInTheDocument();
  });

  it("shows the formatted measurement date when provided", () => {
    render(
      <TankCard tank={baseTank} lastMeasurementAt="2026-05-08T12:00:00Z" />,
    );
    expect(screen.getByText(/Letzte Messung/)).toBeInTheDocument();
    expect(screen.getByText(/\d{2}\.\d{2}\.2026/)).toBeInTheDocument();
  });

  it("shows summary fields from the tank list response when present", () => {
    render(
      <TankCard
        tank={{
          ...baseTank,
          last_water_test_at: "2026-05-08T12:00:00Z",
          latest_diagnosis_type: "oxygen_low",
          latest_diagnosis_severity: "high",
          latest_diagnosis_confidence: 0.82,
        }}
      />,
    );

    expect(screen.getByText(/Letzte Messung/)).toBeInTheDocument();
    expect(screen.getByText(/Letzte Diagnose/)).toBeInTheDocument();
    expect(screen.getByText(/oxygen_low/)).toBeInTheDocument();
    expect(screen.getByText(/Konfidenz 82%/)).toBeInTheDocument();
    expect(screen.getByTestId("severity-badge")).toHaveAttribute(
      "data-severity",
      "high",
    );
  });
});
