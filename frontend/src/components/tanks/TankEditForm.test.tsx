import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

import { TankEditForm } from "./TankEditForm";

const originalFetch = global.fetch;

const baseTank = {
  id: 9,
  name: "Wohnzimmer",
  volume_liters: 180,
  notes: "Filter wechseln",
  created_at: "2026-05-01T08:00:00Z",
};

describe("TankEditForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("prefills name, volume and notes", () => {
    render(<TankEditForm tank={baseTank} />);
    expect(screen.getByLabelText(/Name/i)).toHaveValue("Wohnzimmer");
    expect(screen.getByLabelText(/Volumen/i)).toHaveValue("180");
    expect(screen.getByLabelText(/Notizen/i)).toHaveValue("Filter wechseln");
  });

  it("submits only changed fields and navigates back on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => baseTank,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<TankEditForm tank={baseTank} />);

    fireEvent.change(screen.getByLabelText(/Name/i), {
      target: { value: "Büro" },
    });
    fireEvent.change(screen.getByLabelText(/Notizen/i), {
      target: { value: "" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^Speichern$/i }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/backend/v1/tanks/9");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({ name: "Büro", notes: null });

    expect(pushMock).toHaveBeenCalledWith("/dashboard/tanks/9");
  });

  it("rejects empty name without calling fetch", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<TankEditForm tank={baseTank} />);
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: /^Speichern$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Name eingeben/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
