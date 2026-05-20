import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jblTimerStorageKey } from "@/lib/jbl-timer-runtime";
import { jblTimerId } from "@/lib/jbl-water-test-timers";

import { QuickWaterTestForm } from "./QuickWaterTestForm";

describe("QuickWaterTestForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("zeigt Validierungsfehler bei leerer Messung", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Messung speichern" })[0]);

    expect(screen.getByText(/Bitte mindestens einen Messwert eintragen/i)).toBeInTheDocument();
  });

  it("lässt mehrere Timer parallel laufen und unterstützt Pause/Reset", () => {
    vi.useFakeTimers();
    const now = new Date("2024-06-01T12:00:00Z");
    vi.setSystemTime(now);

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

    expect(within(no2Panel).getByText("04:58")).toBeInTheDocument();
    expect(within(nh4Panel).getByText("14:58")).toBeInTheDocument();

    fireEvent.click(within(no2Panel).getByRole("button", { name: "Pause" }));
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(within(no2Panel).getByText("04:58")).toBeInTheDocument();

    fireEvent.click(within(no2Panel).getByRole("button", { name: "Reset" }));
    expect(within(no2Panel).getByText("05:00")).toBeInTheDocument();
  });

  it("erkennt abgelaufene Timer nach visibilitychange", () => {
    vi.useFakeTimers();
    const now = new Date("2024-06-01T12:00:00Z");
    vi.setSystemTime(now);

    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    const o2Panel = screen.getByText("JBL Timer O₂ – Schritt 1").parentElement;
    if (!o2Panel) throw new Error("O₂-Panel nicht gefunden");

    fireEvent.click(within(o2Panel).getByRole("button", { name: "Start" }));

    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(within(o2Panel).getByText("00:00")).toBeInTheDocument();
    expect(within(o2Panel).getByText(/Schritt 1 ist abgelaufen/i)).toBeInTheDocument();
  });

  it("O₂ und SiO₂: parallele Mehrschritt-Timer laufen unabhängig", () => {
    vi.useFakeTimers();
    const now = new Date("2024-06-01T12:00:00Z");
    vi.setSystemTime(now);

    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    const o2s1 = screen.getByText("JBL Timer O₂ – Schritt 1").parentElement;
    const o2s2 = screen.getByText("JBL Timer O₂ – Schritt 2").parentElement;
    const sio2s1 = screen.getByText("JBL Timer SiO₂ – Schritt 1").parentElement;
    const sio2s2 = screen.getByText("JBL Timer SiO₂ – Schritt 2").parentElement;
    if (!o2s1 || !o2s2 || !sio2s1 || !sio2s2) throw new Error("Timer-Panels nicht gefunden");

    fireEvent.click(within(o2s1).getByRole("button", { name: "Start" }));
    fireEvent.click(within(o2s2).getByRole("button", { name: "Start" }));
    fireEvent.click(within(sio2s1).getByRole("button", { name: "Start" }));
    fireEvent.click(within(sio2s2).getByRole("button", { name: "Start" }));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(within(o2s1).getByText("00:20")).toBeInTheDocument();
    expect(within(o2s2).getByText("09:50")).toBeInTheDocument();
    expect(within(sio2s1).getByText("02:50")).toBeInTheDocument();
    expect(within(sio2s2).getByText("02:50")).toBeInTheDocument();
  });

  it("stellt laufende Timer nach Reload aus localStorage wieder her", () => {
    const tankId = 7;
    const now = 1_700_000_000_000;
    const no2 = jblTimerId("no2", "no2");
    const endsAt = now + 240_000;
    localStorage.setItem(
      jblTimerStorageKey(tankId),
      JSON.stringify({
        [no2]: {
          startedAt: now,
          endsAt,
          durationSeconds: 300,
          status: "running",
          pausedRemainingSeconds: null,
        },
      }),
    );

    vi.useFakeTimers();
    vi.setSystemTime(now + 60_000);

    render(<QuickWaterTestForm tankId={tankId} tankName="Wohnzimmer" />);

    const no2Panel = screen.getByText("JBL Timer NO₂").parentElement;
    if (!no2Panel) throw new Error("NO₂-Panel nicht gefunden");
    expect(within(no2Panel).getByText("03:00")).toBeInTheDocument();
  });

  it("rendert verständliche Labels für Mehrschritt-Timer", () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);

    expect(screen.getByText("JBL Timer O₂ – Schritt 1")).toBeInTheDocument();
    expect(screen.getByText("JBL Timer O₂ – Schritt 2")).toBeInTheDocument();
    expect(screen.getByText("JBL Timer SiO₂ – Schritt 1")).toBeInTheDocument();
    expect(screen.getByText("JBL Timer SiO₂ – Schritt 2")).toBeInTheDocument();
    expect(screen.getByText("JBL Timer SiO₂ – Schritt 3")).toBeInTheDocument();
    expect(screen.getByText("JBL Timer pH 7,4–9,0")).toBeInTheDocument();
    expect(screen.getByText(/Beim Zurückkehren zeigt AquaDiag abgelaufene Timer korrekt an/i)).toBeInTheDocument();
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
