import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { WaterValueChart } from "./WaterValueChart";

describe("WaterValueChart", () => {
  it("shows single-point hint", () => {
    render(
      <WaterValueChart
        title="pH-Wert"
        points={[{ at: "2026-05-08T12:00:00Z", value: 7.2 }]}
      />,
    );

    expect(screen.getByText(/mindestens zwei Messungen/i)).toBeInTheDocument();
    expect(screen.getByText("7,2")).toBeInTheDocument();
  });

  it("renders line chart for two points", () => {
    const { container } = render(
      <WaterValueChart
        title="Nitrit NO₂"
        unit="mg/l"
        points={[
          { at: "2026-05-08T12:00:00Z", value: 0.1 },
          { at: "2026-05-10T12:00:00Z", value: 0.2 },
        ]}
      />,
    );

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("path")).not.toBeNull();
  });
});
