import { describe, expect, it, vi } from "vitest";

import {
  isSeverity,
  SEVERITIES,
  severityClasses,
  severityColor,
  severityHeroAccent,
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
      "bg-status-info/22 text-status-info ring-2 ring-status-info/45 shadow-sm",
    );
    expect(severityClasses("low").badge).toBe(
      "bg-status-success/22 text-status-success ring-2 ring-status-success/45 shadow-sm",
    );
    expect(severityClasses("medium").badge).toBe(
      "bg-status-warning/35 text-aqua-deep ring-2 ring-status-warning/55 shadow-sm",
    );
    expect(severityClasses("high").badge).toBe(
      "bg-status-alert/22 text-status-alert ring-2 ring-status-alert/50 shadow-sm",
    );
    expect(severityClasses("critical").badge).toBe(
      "bg-status-critical/22 text-status-critical ring-2 ring-status-critical/50 shadow-sm",
    );
  });

  it("returns the slate fallback for unknown severities", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      expect(severityClasses("xyz").badge).toBe(
        "bg-aqua-sand text-aqua-deep ring-2 ring-aqua-deep/30 shadow-sm",
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe("severityHeroAccent", () => {
  it("maps severities to a left stripe accent class string", () => {
    expect(severityHeroAccent("critical").wrap).toContain("border-l-status-critical");
    expect(severityHeroAccent("info").wrap).toContain("border-l-status-info");
  });
});
