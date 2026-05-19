import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WaterQualityItemCard } from "./WaterQualityItemCard";

describe("WaterQualityItemCard", () => {
  it("renders label, value with unit, message and recommendation", () => {
    render(
      <WaterQualityItemCard
        item={{
          key: "no2",
          label: "Nitrit (NO₂)",
          value: 0.4,
          unit: "mg/l",
          status: "critical",
          message: "Nitrit deutlich erhöht – akut kritisch für Fische.",
          recommendation_short: "Sofort 30–50 % Wasserwechsel, nicht füttern.",
        }}
      />,
    );

    const card = screen.getByTestId("water-quality-item-card");
    expect(card).toHaveAttribute("data-key", "no2");
    expect(card).toHaveAttribute("data-status", "critical");
    expect(screen.getByText(/Nitrit \(NO₂\)/)).toBeInTheDocument();
    expect(screen.getByText(/0,4 mg\/l/)).toBeInTheDocument();
    expect(screen.getByText(/akut kritisch/)).toBeInTheDocument();
    expect(screen.getByText(/nicht füttern/)).toBeInTheDocument();
  });

  it("renders low nitrate as green not critical", () => {
    render(
      <WaterQualityItemCard
        item={{
          key: "no3",
          label: "Nitrat (NO₃)",
          value: 0.5,
          unit: "mg/l",
          status: "green",
          message: "Nitrat liegt im unkritischen Bereich für Fische.",
          recommendation_short:
            "Nitrat ist sehr niedrig und kann bei Pflanzenproblemen relevant sein.",
        }}
      />,
    );

    const card = screen.getByTestId("water-quality-item-card");
    expect(card).toHaveAttribute("data-status", "green");
    expect(card).not.toHaveAttribute("data-status", "critical");
  });

  it("omits unit when not provided", () => {
    render(
      <WaterQualityItemCard
        item={{
          key: "ph",
          label: "pH",
          value: 7,
          status: "green",
          message: "ok",
        }}
      />,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
