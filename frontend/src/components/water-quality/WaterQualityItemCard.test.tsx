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
          status: "red",
          message: "Nitrit deutlich erhöht – akut kritisch für Fische.",
          recommendation_short: "Sofort 30–50 % Wasserwechsel, nicht füttern.",
        }}
      />,
    );

    const card = screen.getByTestId("water-quality-item-card");
    expect(card).toHaveAttribute("data-key", "no2");
    expect(card).toHaveAttribute("data-status", "red");
    expect(screen.getByText(/Nitrit \(NO₂\)/)).toBeInTheDocument();
    expect(screen.getByText(/0,4 mg\/l/)).toBeInTheDocument();
    expect(screen.getByText(/akut kritisch/)).toBeInTheDocument();
    expect(screen.getByText(/nicht füttern/)).toBeInTheDocument();
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
