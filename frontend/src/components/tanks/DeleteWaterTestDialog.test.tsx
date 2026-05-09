import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: refreshMock,
    replace: vi.fn(),
  }),
}));

import { DeleteWaterTestDialog } from "./DeleteWaterTestDialog";

const originalFetch = global.fetch;

describe("DeleteWaterTestDialog", () => {
  beforeEach(() => {
    refreshMock.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("mentions cascade deletion of diagnosis in the dialog text", () => {
    render(<DeleteWaterTestDialog waterTestId={9} />);
    fireEvent.click(screen.getByRole("button", { name: /^Löschen$/i }));

    expect(screen.getByRole("dialog")).toHaveTextContent(/Diagnose zu dieser Messung/i);
  });

  it("calls DELETE and refreshes on confirm", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => null,
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<DeleteWaterTestDialog waterTestId={11} />);
    fireEvent.click(screen.getByRole("button", { name: /^Löschen$/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Endgültig löschen/i }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/backend/v1/water-tests/11");
    expect(init.method).toBe("DELETE");
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
