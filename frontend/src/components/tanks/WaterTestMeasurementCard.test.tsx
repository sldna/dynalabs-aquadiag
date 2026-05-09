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
});
