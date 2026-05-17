import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { WaterTest } from "@/lib/types";

import { WaterValueHistorySection } from "./WaterValueHistorySection";

vi.mock("./WaterValueHistoryCard", () => ({
  WaterValueHistoryCard: ({ test }: { test: WaterTest }) => (
    <div data-testid={`card-${test.id}`}>card</div>
  ),
}));

vi.mock("./WaterValueChart", () => ({
  WaterValueChart: ({ title }: { title: string }) => <div data-testid={`chart-${title}`} />,
}));

describe("WaterValueHistorySection", () => {
  it("shows empty state with CTA when there are no tests", () => {
    render(<WaterValueHistorySection tankId={3} waterTests={[]} />);

    expect(screen.getByRole("heading", { name: /Wasserwerte/i })).toBeInTheDocument();
    expect(screen.getByText(/Noch keine Messwerte vorhanden/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Neue Analyse starten/i })[0]).toHaveAttribute(
      "href",
      "/dashboard/diagnose?tank=3",
    );
  });

  it("shows load error when waterTests is null", () => {
    render(<WaterValueHistorySection tankId={2} waterTests={null} />);

    expect(screen.getByText(/Wasserwerte konnten nicht geladen werden/i)).toBeInTheDocument();
  });

  it("renders charts and history cards", () => {
    const tests: WaterTest[] = [
      {
        id: 10,
        tank_id: 2,
        created_at: "2026-05-08T12:00:00Z",
        ph: 7.0,
        symptoms: [],
      },
      {
        id: 11,
        tank_id: 2,
        created_at: "2026-05-10T12:00:00Z",
        ph: 7.2,
        symptoms: [],
      },
    ];
    render(<WaterValueHistorySection tankId={2} waterTests={tests} />);

    expect(screen.getByTestId("chart-pH-Wert")).toBeInTheDocument();
    expect(screen.getByTestId("card-10")).toBeInTheDocument();
    expect(screen.getByTestId("card-11")).toBeInTheDocument();
  });

  it("changes range filter", () => {
    const tests: WaterTest[] = [
      {
        id: 1,
        tank_id: 2,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        ph: 7.0,
        symptoms: [],
      },
    ];
    render(<WaterValueHistorySection tankId={2} waterTests={tests} />);

    fireEvent.click(screen.getByRole("button", { name: "7 Tage" }));
    expect(screen.getByRole("button", { name: "7 Tage" })).toHaveAttribute("aria-pressed", "true");
  });
});
