import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { QuickWaterTestForm } from "./QuickWaterTestForm";

describe("QuickWaterTestForm", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("zeigt Validierungsfehler bei leerer Messung", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Messung speichern" })[0]);

    expect(screen.getByText(/Bitte mindestens einen Messwert eintragen/i)).toBeInTheDocument();
  });

  it("lässt mehrere Timer parallel laufen und unterstützt Pause/Reset", () => {
    vi.useFakeTimers();
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    const no2Panel = screen.getByText("JBL Timer NO₂").parentElement;
    const nh4Panel = screen.getByText("JBL Timer NH₄").parentElement;
    if (!no2Panel || !nh4Panel) {
      throw new Error("Timer-Panels nicht gefunden");
    }

    fireEvent.click(within(no2Panel).getByRole("button", { name: "Start" }));
    fireEvent.click(within(nh4Panel).getByRole("button", { name: "Start" }));

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(within(no2Panel).getByText("02:58")).toBeInTheDocument();
    expect(within(nh4Panel).getByText("04:58")).toBeInTheDocument();

    fireEvent.click(within(no2Panel).getByRole("button", { name: "Pause" }));
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(within(no2Panel).getByText("02:58")).toBeInTheDocument();

    fireEvent.click(within(no2Panel).getByRole("button", { name: "Reset" }));
    expect(within(no2Panel).getByText("03:00")).toBeInTheDocument();
  });

  it("speichert erfolgreich und zeigt Follow-up-Aktionen", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 42 }),
    } as Response);

    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    fireEvent.change(screen.getByLabelText(/^pH$/i), { target: { value: "7.2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Messung speichern" })[0]);

    expect(await screen.findByText(/Messung gespeichert/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Analyse mit diesen Werten starten/i })).toBeDisabled();
    expect(
      screen.getByText(/Analyse aus gespeicherter Messung folgt im nächsten Schritt/i),
    ).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(String(call?.[1]?.body ?? "{}")) as Record<string, unknown>;
    expect(body.ph).toBe(7.2);
  });
});
