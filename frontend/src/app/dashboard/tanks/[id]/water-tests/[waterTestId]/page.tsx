import Link from "next/link";
import type { ReactNode } from "react";

import { Card, PageContainer } from "@/components/layout";
import { serverFetchBase } from "@/lib/api-base";
import { formatDateTimeDE } from "@/lib/date";
import type { Tank, WaterTest } from "@/lib/types";
import { measurementRowsForWaterTest } from "@/lib/water-test-rows";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string; waterTestId: string }>;
};

type LoadOk = { kind: "ok"; tank: Tank; test: WaterTest };
type LoadResult =
  | LoadOk
  | { kind: "invalid_id" }
  | { kind: "not_found" }
  | { kind: "mismatch" }
  | { kind: "error"; message: string };

async function loadWaterTestDetail(
  tankIdStr: string,
  waterTestIdStr: string,
): Promise<LoadResult> {
  const tankNum = Number(tankIdStr);
  const wtNum = Number(waterTestIdStr);
  if (!Number.isInteger(tankNum) || tankNum < 1 || !Number.isInteger(wtNum) || wtNum < 1) {
    return { kind: "invalid_id" };
  }

  const base = serverFetchBase();

  let tankRes: Response;
  try {
    tankRes = await fetch(`${base}/v1/tanks/${tankNum}`, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Netzwerkfehler",
    };
  }

  if (tankRes.status === 404) {
    return { kind: "not_found" };
  }
  if (!tankRes.ok) {
    return { kind: "error", message: `HTTP ${tankRes.status}` };
  }
  const tank = (await tankRes.json()) as Tank;

  let wtRes: Response;
  try {
    wtRes = await fetch(`${base}/v1/water-tests/${wtNum}`, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Netzwerkfehler",
    };
  }

  if (wtRes.status === 404) {
    return { kind: "not_found" };
  }
  if (!wtRes.ok) {
    return { kind: "error", message: `HTTP ${wtRes.status}` };
  }

  const test = (await wtRes.json()) as WaterTest;
  if (test.tank_id !== tankNum) {
    return { kind: "mismatch" };
  }

  return { kind: "ok", tank, test };
}

export default async function WaterTestDetailPage({ params }: RouteParams) {
  const { id, waterTestId } = await params;
  const result = await loadWaterTestDetail(id, waterTestId);

  return (
    <PageContainer>
      <Link
        href={`/dashboard/tanks/${id}`}
        className="text-sm text-aqua-blue underline decoration-aqua-blue/40"
      >
        ← Zurück zum Becken
      </Link>

      {result.kind === "invalid_id" ? (
        <Panel title="Ungültige Angaben">
          <p>Die angegebenen IDs sind ungültig.</p>
        </Panel>
      ) : result.kind === "mismatch" ? (
        <Panel title="Nicht gefunden">
          <p>Diese Messung gehört nicht zu diesem Becken.</p>
        </Panel>
      ) : result.kind === "not_found" ? (
        <Panel title="Nicht gefunden">
          <p>Becken oder Messung existiert nicht (mehr).</p>
        </Panel>
      ) : result.kind === "error" ? (
        <Panel title="Fehler">
          <p>{result.message}</p>
        </Panel>
      ) : (
        <DetailBody tank={result.tank} test={result.test} />
      )}
    </PageContainer>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section">
      <h1 className="text-base font-semibold text-aqua-deep">{title}</h1>
      <div className="mt-2 text-sm text-aqua-deep/85">{children}</div>
    </Card>
  );
}

function DetailBody({ tank, test }: { tank: Tank; test: WaterTest }) {
  const when = formatDateTimeDE(test.created_at);
  const rows = measurementRowsForWaterTest(test);
  const notes = test.notes?.trim();

  return (
    <>
      <header className="space-y-1">
        <p className="text-sm font-medium text-aqua-deep">Messung</p>
        <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep">
          {when ?? "Messung"}
        </h1>
        <p className="text-sm text-aqua-deep/75">
          Becken: {tank.name} · ID {test.id}
        </p>
      </header>

      <Card as="section" aria-label="Messwerte">
        {rows.length > 0 ? (
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-aqua-deep">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-aqua-deep/75">
            Keine Messwerte oder Symptome erfasst.
          </p>
        )}
        {notes ? (
          <div className="mt-4 border-t border-aqua-deep/10 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
              Notizen
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-aqua-deep">{notes}</p>
          </div>
        ) : null}
      </Card>

      <Link
        href={`/dashboard/diagnose?tank=${tank.id}`}
        className="block w-full rounded-button bg-aqua-blue px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#168EAA]"
      >
        Neue Analyse starten
      </Link>
    </>
  );
}
