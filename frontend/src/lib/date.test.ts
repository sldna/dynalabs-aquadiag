import { describe, expect, it } from "vitest";

import { formatDateDE, formatDateTimeDE } from "./date";

describe("formatDateDE", () => {
  it("returns null for null/undefined/empty inputs", () => {
    expect(formatDateDE(null)).toBeNull();
    expect(formatDateDE(undefined)).toBeNull();
    expect(formatDateDE("")).toBeNull();
    expect(formatDateDE("   ")).toBeNull();
  });

  it("formats RFC3339 timestamps as DD.MM.YYYY in local time", () => {
    expect(formatDateDE("2026-05-08T12:00:00Z")).toMatch(/^\d{2}\.\d{2}\.2026$/);
  });

  it("falls back to the raw input on unparseable values", () => {
    expect(formatDateDE("nope")).toBe("nope");
  });
});

describe("formatDateTimeDE", () => {
  it("returns null for empty inputs", () => {
    expect(formatDateTimeDE(null)).toBeNull();
    expect(formatDateTimeDE("")).toBeNull();
  });

  it("formats a parseable timestamp", () => {
    const s = formatDateTimeDE("2026-05-08T15:30:00Z");
    expect(s).toBeTruthy();
    expect(s).toMatch(/\d{2}[,.]\d{2}[,.]\d{2}/);
    expect(s).toMatch(/\d{1,2}:\d{2}/);
  });

  it("interprets SQLite UTC timestamps without timezone marker as UTC", () => {
    expect(formatDateTimeDE("2026-05-08 15:30:00")).toMatch(/17:30/);
  });

  it("falls back to raw string when unparseable", () => {
    expect(formatDateTimeDE("nope")).toBe("nope");
  });
});
