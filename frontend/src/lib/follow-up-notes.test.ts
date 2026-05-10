import { describe, expect, it } from "vitest";

import { appendFollowUpAnswersToNotes } from "./follow-up-notes";

describe("appendFollowUpAnswersToNotes", () => {
  it("appends only answered questions", () => {
    expect(
      appendFollowUpAnswersToNotes("Hallo", ["A?", "B?"], { "0": "ja" }),
    ).toBe(`Hallo\n\n[Nachfragen – Antworten]\n• A?\n  → ja`);
  });

  it("returns base notes when no answers", () => {
    expect(appendFollowUpAnswersToNotes("x", ["A?"], {})).toBe("x");
  });
});
