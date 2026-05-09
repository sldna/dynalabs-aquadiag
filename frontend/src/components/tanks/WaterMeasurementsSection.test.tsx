import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { WaterTest } from "@/lib/types";

import { WaterMeasurementsSection } from "./WaterMeasurementsSection";

vi.mock("./WaterTestMeasurementCard", () => ({
  WaterTestMeasurementCard: ({ test }: { test: WaterTest }) => (
    <div data-testid={`card-${test.id}`}>card</div>
  ),
}));

describe("WaterMeasurementsSection", () => {
  it("shows empty state when there are no tests", () => {
    render(<WaterMeasurementsSection tankId={3} waterTests={[]} />);

    expect(screen.getByRole("heading", { name: /Messwerte/i })).toBeInTheDocument();
    expect(screen.getByText(/Noch keine Messwerte vorhanden/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Neue Analyse starten/i })).toHaveAttribute(
      "href",
      "/dashboard/diagnose?tank=3",
    );
  });

  it("shows load error when waterTests is null", () => {
    render(<WaterMeasurementsSection tankId={2} waterTests={null} />);

    expect(screen.getByText(/Messwerte konnten nicht geladen werden/i)).toBeInTheDocument();
  });

  it("renders a card per measurement", () => {
    const tests: WaterTest[] = [
      {
        id: 10,
        tank_id: 2,
        created_at: "2026-01-01T00:00:00Z",
        symptoms: [],
      },
      {
        id: 11,
        tank_id: 2,
        created_at: "2026-01-02T00:00:00Z",
        symptoms: [],
      },
    ];
    render(<WaterMeasurementsSection tankId={2} waterTests={tests} />);

    expect(screen.getByTestId("card-10")).toBeInTheDocument();
    expect(screen.getByTestId("card-11")).toBeInTheDocument();
  });
});
