import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { WaterTest } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

import { WaterTestMeasurementCard } from "./WaterTestMeasurementCard";

describe("WaterTestMeasurementCard", () => {
  it("renders Details link to the water-test detail route", () => {
    const test: WaterTest = {
      id: 42,
      tank_id: 7,
      nitrite_mg_l: 0.1,
      symptoms: [],
      created_at: "2026-03-01T08:00:00Z",
    };

    render(<WaterTestMeasurementCard tankId={7} test={test} />);

    const details = screen.getByRole("link", { name: /Details/i });
    expect(details).toHaveAttribute("href", "/dashboard/tanks/7/water-tests/42");
    expect(screen.getByText(/Nitrit/i)).toBeInTheDocument();
  });

  it("renders a traffic-light badge for the test status", () => {
    const test: WaterTest = {
      id: 42,
      tank_id: 7,
      nitrite_mg_l: 0.4,
      symptoms: [],
      created_at: "2026-03-01T08:00:00Z",
      water_quality_status: "red",
      water_quality_items: [],
    };

    render(<WaterTestMeasurementCard tankId={7} test={test} />);

    const badge = screen.getByTestId("water-quality-badge");
    expect(badge).toHaveAttribute("data-status", "red");
    expect(badge).toHaveTextContent(/Kritisch/);
  });

  it("falls back to a 'Nicht bewertet' badge when status is missing", () => {
    const test: WaterTest = {
      id: 1,
      tank_id: 1,
      symptoms: [],
      created_at: "2026-03-01T08:00:00Z",
    };

    render(<WaterTestMeasurementCard tankId={1} test={test} />);

    const badge = screen.getByTestId("water-quality-badge");
    expect(badge).toHaveAttribute("data-status", "unknown");
    expect(badge).toHaveTextContent(/Nicht bewertet/);
  });
});
