import { describe, expect, it, vi } from "vitest";

import {
  isSeverity,
  SEVERITIES,
  severityClasses,
  severityColor,
  type Severity,
} from "./severity";

describe("isSeverity", () => {
  it.each(SEVERITIES)("accepts canonical value %s", (s) => {
    expect(isSeverity(s)).toBe(true);
  });

  it.each(["", " ", "High", "HIGH", "warning", "danger", null, undefined, 1, {}])(
    "rejects non-canonical value %p",
    (s) => {
      expect(isSeverity(s)).toBe(false);
    },
  );
});

describe("severityColor", () => {
  const cases: ReadonlyArray<[Severity, string]> = [
    ["info", "blue"],
    ["low", "green"],
    ["medium", "yellow"],
    ["high", "orange"],
    ["critical", "red"],
  ];

  it.each(cases)("maps %s -> %s", (severity, color) => {
    expect(severityColor(severity)).toBe(color);
  });

  it("falls back to slate for unknown values and warns once in dev", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(severityColor("warning")).toBe("slate");
      expect(severityColor("warning")).toBe("slate");
      expect(warn).toHaveBeenCalledTimes(1);
      const msg = String(warn.mock.calls[0]?.[0] ?? "");
      expect(msg).toContain("warning");
      expect(msg).toContain("info");
      expect(msg).toContain("critical");
    } finally {
      warn.mockRestore();
    }
  });
});

describe("severityClasses", () => {
  it("returns the expected Tailwind class set per severity", () => {
    expect(severityClasses("info").badge).toBe(
      "bg-status-info/15 text-status-info ring-status-info/30",
    );
    expect(severityClasses("low").badge).toBe(
      "bg-status-success/15 text-status-success ring-status-success/30",
    );
    expect(severityClasses("medium").badge).toBe(
      "bg-status-warning/25 text-aqua-deep ring-status-warning/40",
    );
    expect(severityClasses("high").badge).toBe(
      "bg-status-alert/15 text-status-alert ring-status-alert/35",
    );
    expect(severityClasses("critical").badge).toBe(
      "bg-status-critical/15 text-status-critical ring-status-critical/35",
    );
  });

  it("returns the slate fallback for unknown severities", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(severityClasses("xyz").badge).toBe(
        "bg-aqua-sand text-aqua-deep ring-aqua-deep/20",
      );
    } finally {
      warn.mockRestore();
    }
  });
});
