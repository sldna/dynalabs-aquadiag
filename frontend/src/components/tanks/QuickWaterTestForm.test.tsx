import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_WATER_TEST_CONFIG } from "@/lib/water-test-config.fixture";
import { timerStorageKey } from "@/lib/water-test-timer-runtime";
import { waterTestTimerId } from "@/lib/water-test-config";

import { QuickWaterTestForm } from "./QuickWaterTestForm";

function mockConfigFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/v1/water-test-config")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => MOCK_WATER_TEST_CONFIG,
        } as Response);
      }
      if (url.includes("/water-tests") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: 42 }),
        } as Response);
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    }),
  );
}

describe("QuickWaterTestForm", () => {
  beforeEach(() => {
    localStorage.clear();
    mockConfigFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("lädt Config und rendert Werteauswahl", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    expect(await screen.findByText(/Nitrat \(NO₃\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /0,5 mg\/l/i })).toBeInTheDocument();
  });

  it("blendet deaktivierte Messwerte aus", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    expect(await screen.findByText(/Nitrat \(NO₃\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/Kupfer \(Cu\)/i)).not.toBeInTheDocument();
  });

  it("zeigt NO3 0.5 als unauffällig nicht kritisch", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    await screen.findByText(/Nitrat \(NO₃\)/i);
    fireEvent.click(screen.getByRole("button", { name: /0,5 mg\/l/i }));
    expect(screen.getByText("Unauffällig")).toBeInTheDocument();
    expect(screen.queryByText("Kritisch")).not.toBeInTheDocument();
  });

  it("zeigt Validierungsfehler bei leerer Messung", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    const saveBtn = await screen.findAllByRole("button", { name: "Messung speichern" });
    fireEvent.click(saveBtn[0]);
    expect(screen.getByText(/Bitte mindestens einen Messwert eintragen/i)).toBeInTheDocument();
  });

  it("lässt mehrere Timer parallel laufen und unterstützt Pause/Reset", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    await screen.findByText("JBL Timer NO₂");

    vi.useFakeTimers();
    const now = new Date("2024-06-01T12:00:00Z");
    vi.setSystemTime(now);

    const no2Panel = screen.getByText("JBL Timer NO₂").parentElement;
    const nh4Panel = screen.getByText("JBL Timer NH₄").parentElement;
    if (!no2Panel || !nh4Panel) {
      throw new Error("Timer-Panels nicht gefunden");
    }

    fireEvent.click(within(no2Panel).getByRole("button", { name: "Start" }));
    fireEvent.click(within(nh4Panel).getByRole("button", { name: "Start" }));

    await act(async () => {
      vi.advanceTimersByTime(2_000);
      document.dispatchEvent(new Event("visibilitychange"));
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

  it("erkennt abgelaufene Timer nach visibilitychange", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    await screen.findByText("JBL Timer O₂ – Schritt 1");

    vi.useFakeTimers();
    const now = new Date("2024-06-01T12:00:00Z");
    vi.setSystemTime(now);

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

  it("O₂ und SiO₂: parallele Mehrschritt-Timer laufen unabhängig", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    await screen.findByText("JBL Timer O₂ – Schritt 1");

    vi.useFakeTimers();
    const now = new Date("2024-06-01T12:00:00Z");
    vi.setSystemTime(now);

    const o2s1 = screen.getByText("JBL Timer O₂ – Schritt 1").parentElement;
    const o2s2 = screen.getByText("JBL Timer O₂ – Schritt 2").parentElement;
    const sio2s1 = screen.getByText("JBL Timer SiO₂ – Schritt 1").parentElement;
    const sio2s2 = screen.getByText("JBL Timer SiO₂ – Schritt 2").parentElement;
    if (!o2s1 || !o2s2 || !sio2s1 || !sio2s2) throw new Error("Timer-Panels nicht gefunden");

    fireEvent.click(within(o2s1).getByRole("button", { name: "Start" }));
    fireEvent.click(within(o2s2).getByRole("button", { name: "Start" }));
    fireEvent.click(within(sio2s1).getByRole("button", { name: "Start" }));
    fireEvent.click(within(sio2s2).getByRole("button", { name: "Start" }));

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(within(o2s1).getByText("00:20")).toBeInTheDocument();
    expect(within(o2s2).getByText("09:50")).toBeInTheDocument();
    expect(within(sio2s1).getByText("02:50")).toBeInTheDocument();
    expect(within(sio2s2).getByText("02:50")).toBeInTheDocument();
  });

  it("stellt laufende Timer nach Reload aus localStorage wieder her", async () => {
    const tankId = 7;
    const base = Date.now();
    const no2 = waterTestTimerId("no2", "no2");
    localStorage.setItem(
      timerStorageKey(tankId),
      JSON.stringify({
        [no2]: {
          startedAt: base,
          endsAt: base + 240_000,
          durationSeconds: 300,
          status: "running",
          pausedRemainingSeconds: null,
        },
      }),
    );

    render(<QuickWaterTestForm tankId={tankId} tankName="Wohnzimmer" />);
    await screen.findByText("JBL Timer NO₂");

    const no2Panel = screen.getByText("JBL Timer NO₂").parentElement;
    if (!no2Panel) throw new Error("NO₂-Panel nicht gefunden");

    await waitFor(() => {
      expect(within(no2Panel!).queryByText("05:00")).not.toBeInTheDocument();
      expect(within(no2Panel!).getByText("04:00")).toBeInTheDocument();
    });
  });

  it("speichert erfolgreich und zeigt Follow-up-Aktionen", async () => {
    render(<QuickWaterTestForm tankId={7} tankName="Wohnzimmer" />);
    await screen.findByText(/^pH$/i);
    const phInput = document.getElementById("water-test-ph");
    if (!phInput) throw new Error("pH-Eingabe nicht gefunden");
    fireEvent.change(phInput, { target: { value: "7.2" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Messung speichern" })[0]);

    expect(await screen.findByText(/Messung gespeichert/i)).toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
  });
});
