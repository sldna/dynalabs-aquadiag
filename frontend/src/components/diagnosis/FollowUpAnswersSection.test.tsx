import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FollowUpAnswersSection } from "./FollowUpAnswersSection";

describe("FollowUpAnswersSection", () => {
  it("calls onPersistAnswers when saving", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    render(
      <FollowUpAnswersSection
        questions={["Erste Frage?"]}
        diagnosisId={5}
        initialAnswers={{}}
        onPersistAnswers={onPersist}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Erste Frage/i), {
      target: { value: "Antwort A" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Antworten speichern" }));

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist).toHaveBeenCalledWith({ "0": "Antwort A" });
  });

  it("shows saved confirmation after successful persist", async () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    render(
      <FollowUpAnswersSection
        questions={["X?"]}
        diagnosisId={1}
        initialAnswers={{}}
        onPersistAnswers={onPersist}
      />,
    );

    fireEvent.change(screen.getByLabelText(/X/i), { target: { value: "y" } });
    fireEvent.click(screen.getByRole("button", { name: "Antworten speichern" }));

    await waitFor(() =>
      expect(screen.getByTestId("follow-ups-saved")).toBeInTheDocument(),
    );
  });
});
