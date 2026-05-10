import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  it("renders the severity value as default label", () => {
    render(<SeverityBadge severity="high" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("high");
    expect(badge).toHaveAttribute("data-severity", "high");
  });

  it("renders the optional label instead of the raw severity", () => {
    render(<SeverityBadge severity="critical" label="Sofort handeln" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("Sofort handeln");
    expect(badge).not.toHaveTextContent("critical");
    expect(badge).toHaveAttribute("data-severity", "critical");
  });

  it("applies the color classes that match the severity", () => {
    const { rerender } = render(<SeverityBadge severity="info" />);
    expect(screen.getByTestId("severity-badge").className).toContain(
      "bg-status-info/22",
    );

    rerender(<SeverityBadge severity="low" />);
    expect(screen.getByTestId("severity-badge").className).toContain(
      "bg-status-success/22",
    );

    rerender(<SeverityBadge severity="medium" />);
    expect(screen.getByTestId("severity-badge").className).toContain(
      "bg-status-warning/35",
    );

    rerender(<SeverityBadge severity="high" />);
    expect(screen.getByTestId("severity-badge").className).toContain(
      "bg-status-alert/22",
    );

    rerender(<SeverityBadge severity="critical" />);
    expect(screen.getByTestId("severity-badge").className).toContain(
      "bg-status-critical/22",
    );
  });

  it("falls back to slate styling for unknown severity", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<SeverityBadge severity="totally_unknown" />);
      expect(screen.getByTestId("severity-badge").className).toContain(
        "bg-aqua-sand",
      );
    } finally {
      warn.mockRestore();
    }
  });
});
