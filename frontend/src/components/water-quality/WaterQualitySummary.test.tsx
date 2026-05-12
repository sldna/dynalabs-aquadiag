import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { WaterQualityItem } from "@/lib/types";

import { WaterQualitySummary } from "./WaterQualitySummary";

const items: WaterQualityItem[] = [
  {
    key: "no2",
    label: "Nitrit (NO₂)",
    value: 0.4,
    unit: "mg/l",
    status: "red",
    message: "Nitrit deutlich erhöht – akut kritisch für Fische.",
    recommendation_short: "Sofort 30–50 % Wasserwechsel, nicht füttern.",
  },
  {
    key: "ph",
    label: "pH-Wert",
    value: 7.2,
    status: "green",
    message: "Im typischen Bereich für Süßwasseraquarien.",
  },
];

describe("WaterQualitySummary", () => {
  it("shows status headline and item cards when items are present", () => {
    render(<WaterQualitySummary status="red" items={items} />);

    const root = screen.getByTestId("water-quality-summary");
    expect(root).toHaveAttribute("data-status", "red");
    expect(screen.getByText(/Wasserwerte kritisch/)).toBeInTheDocument();
    expect(screen.getByText(/Nitrit \(NO₂\)/)).toBeInTheDocument();
    expect(screen.getByText(/pH-Wert/)).toBeInTheDocument();
    expect(
      screen.getByText(/Sofort 30–50 % Wasserwechsel/),
    ).toBeInTheDocument();
    const cards = screen.getAllByTestId("water-quality-item-card");
    expect(cards).toHaveLength(2);
  });

  it("renders gracefully without items (empty state)", () => {
    render(<WaterQualitySummary status="unknown" items={[]} />);

    const root = screen.getByTestId("water-quality-summary");
    expect(root).toHaveAttribute("data-status", "unknown");
    expect(screen.getByText(/Noch keine bewertbaren Werte/)).toBeInTheDocument();
    expect(
      screen.getByText(/Erfasse Nitrit, pH und weitere Werte/),
    ).toBeInTheDocument();
  });

  it("does not crash when items prop is undefined", () => {
    render(<WaterQualitySummary />);
    const root = screen.getByTestId("water-quality-summary");
    expect(root).toHaveAttribute("data-status", "unknown");
  });

  it("always shows the orientation disclaimer", () => {
    render(<WaterQualitySummary status="green" items={items} />);
    expect(
      screen.getByText(/Orientierung anhand der Messwerte\. Ersetzt keine Diagnose\./),
    ).toBeInTheDocument();
  });
});
