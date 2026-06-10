import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { WaterTestConfigResponse } from "@/lib/water-test-config";

import { WaterTestSettingsClient } from "./WaterTestSettingsClient";

const activeVersion = {
  id: 1,
  name: "JBL Freshwater Default v1",
  is_active: true,
  is_draft: false,
  created_at: "2026-06-07T12:00:00Z",
  updated_at: "2026-06-07T12:00:00Z",
  tests: [
    {
      id: 1,
      key: "nitrate_no3",
      label: "Nitrat (NO₃)",
      brand: "JBL",
      unit: "mg/l",
      input_type: "select",
      sort_order: 1,
      is_active: true,
      can_delete: false,
      delete_blocked_reason: "Dieser Wassertest ist bereits mit Messungen verknüpft.",
      values: [{ value: 0.5, label: "0,5", display_value: "0,5", sort_order: 1 }],
      thresholds: [{ min_value: 0, max_value: 30, status: "ok", message: "Nitrat liegt im üblichen Bereich.", sort_order: 1 }],
      timers: [],
    },
    {
      id: 2,
      key: "phosphate_po4",
      label: "Phosphat (PO₄)",
      brand: "JBL",
      unit: "mg/l",
      input_type: "number",
      sort_order: 2,
      is_active: true,
      can_delete: true,
      values: [],
      thresholds: [],
      timers: [],
    },
  ],
  thresholds: {},
  timers: {
    no3: {
      test_key: "no3",
      label: "NO₃",
      field_key: "nitrate_no3",
      is_active: true,
      sort_order: 1,
      steps: [{ step_id: "no3", step_label: "Einwirkzeit", label: "Einwirkzeit", duration_seconds: 300, step_order: 0 }],
    },
    ph_74_90: {
      test_key: "ph_74_90",
      label: "pH 7,4–9,0",
      is_active: false,
      sort_order: 2,
      steps: [{ step_id: "ph_74_90", step_label: "Einwirkzeit", label: "Einwirkzeit", duration_seconds: 180, step_order: 0 }],
    },
  },
  timer_groups: [
    {
      test_key: "no3",
      label: "NO₃",
      field_key: "nitrate_no3",
      is_active: true,
      sort_order: 1,
      steps: [{ step_id: "no3", step_label: "Einwirkzeit", label: "Einwirkzeit", duration_seconds: 300, step_order: 0 }],
    },
    {
      test_key: "ph_74_90",
      label: "pH 7,4–9,0",
      is_active: false,
      sort_order: 2,
      steps: [{ step_id: "ph_74_90", step_label: "Einwirkzeit", label: "Einwirkzeit", duration_seconds: 180, step_order: 0 }],
    },
  ],
};

const draftVersion = { ...activeVersion, id: 2, name: "JBL Freshwater Default v1 Entwurf", is_active: false, is_draft: true };

describe("WaterTestSettingsClient", () => {
  beforeEach(() => {
    let selected: WaterTestConfigResponse = activeVersion;
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (url.endsWith("/v1/water-test-config/versions") && method === "GET") {
          return json({ versions: selected.id === 2 ? [activeVersion, draftVersion] : [activeVersion] });
        }
        if (url.endsWith("/v1/water-test-config/versions/1") && method === "GET") return json(activeVersion);
        if (url.endsWith("/v1/water-test-config/versions/2") && method === "GET") return json(selected);
        if (url.endsWith("/v1/water-test-config/versions/duplicate-active") && method === "POST") {
          selected = draftVersion;
          return json(draftVersion);
        }
        if (url.endsWith("/v1/water-test-config/versions/2") && method === "PUT") {
          selected = JSON.parse(String(init?.body));
          selected = { ...draftVersion, ...selected, id: 2, is_active: false, is_draft: true };
          return json(selected);
        }
        if (url.endsWith("/v1/water-test-config/versions/2") && method === "DELETE") {
          selected = activeVersion;
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        if (url.endsWith("/v1/water-test-config/versions/2/validate") && method === "POST") {
          return json({ valid: true, errors: [] });
        }
        if (url.endsWith("/v1/water-test-config/versions/2/activate") && method === "POST") {
          selected = { ...draftVersion, is_active: true, is_draft: false };
          return json(selected);
        }
        return json({ message: "not found" }, 404);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lädt Versionen, dupliziert aktive Version und aktiviert validierten Draft", async () => {
    render(<WaterTestSettingsClient />);

    expect((await screen.findAllByText("JBL Freshwater Default v1")).length).toBeGreaterThan(0);
    expect(screen.getByText(/Diese Version ist schreibgeschützt/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aktive Version duplizieren" }));
    expect(await screen.findByText("Entwurf ist bearbeitbar.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Versionsname"), { target: { value: "Meine JBL-Skala" } });
    fireEvent.change(screen.getByDisplayValue("NO₃"), { target: { value: "Nitrat Timer" } });
    expect(screen.getByText("2 aktive Messwerte · 1 aktive Timer")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Wassertest löschen" })[1]);
    expect(screen.queryByText("Phosphat (PO₄)")).not.toBeInTheDocument();
    expect(screen.getByText("1 aktive Messwerte · 1 aktive Timer")).toBeInTheDocument();

    fireEvent.change(screen.getAllByLabelText("Nachricht")[0], { target: { value: "Nitrat bleibt ok." } });
    fireEvent.change(screen.getAllByLabelText("Sekunden")[0], { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    await screen.findByText("Entwurf gespeichert.");
    expect(await screen.findByDisplayValue("Meine JBL-Skala")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Validieren" }));
    await screen.findByText("Validierung erfolgreich");

    await waitFor(() => expect(screen.getByRole("button", { name: "Aktivieren" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Aktivieren" }));
    expect(await screen.findByText(/Aktiviert\./)).toBeInTheDocument();
  });

  it("löscht nicht aktive Versionen", async () => {
    render(<WaterTestSettingsClient />);
    expect((await screen.findAllByText("JBL Freshwater Default v1")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Aktive Version duplizieren" }));
    expect(await screen.findByText("Entwurf ist bearbeitbar.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Version löschen" }));
    expect(await screen.findByText("Version gelöscht.")).toBeInTheDocument();
  });
});

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}
