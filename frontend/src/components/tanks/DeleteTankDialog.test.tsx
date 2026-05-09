import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, replace: vi.fn() }),
}));

import { DeleteTankDialog } from "./DeleteTankDialog";

const originalFetch = global.fetch;

describe("DeleteTankDialog", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("opens the dialog with name and cascade explanation when triggered", () => {
    render(<DeleteTankDialog tankId={3} tankName="Wohnzimmer" />);

    fireEvent.click(screen.getByRole("button", { name: /Becken löschen/i }));

    expect(
      screen.getByRole("dialog", { name: /Wohnzimmer/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/zugehörigen Messungen und Diagnosen/i),
    ).toBeInTheDocument();
  });

  it("closes the dialog when Abbrechen is clicked", () => {
    render(<DeleteTankDialog tankId={3} tankName="Wohnzimmer" />);
    fireEvent.click(screen.getByRole("button", { name: /Becken löschen/i }));

    fireEvent.click(screen.getByRole("button", { name: /Abbrechen/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls DELETE and navigates back to the list with deleted query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<DeleteTankDialog tankId={3} tankName="Wohnzimmer" />);
    fireEvent.click(screen.getByRole("button", { name: /Becken löschen/i }));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Endgültig löschen/i }),
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/backend/v1/tanks/3");
    expect(init.method).toBe("DELETE");

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock.mock.calls[0][0]).toBe(
      "/dashboard/tanks?deleted=Wohnzimmer",
    );
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces backend error messages instead of navigating", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "DB kaputt" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<DeleteTankDialog tankId={4} tankName="Büro" />);
    fireEvent.click(screen.getByRole("button", { name: /Becken löschen/i }));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /Endgültig löschen/i }),
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent("DB kaputt");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
