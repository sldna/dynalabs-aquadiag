import Link from "next/link";

import { DashboardNav } from "@/components/DashboardNav";
import { PageContainer } from "@/components/layout";
import { DeleteTankDialog } from "@/components/tanks/DeleteTankDialog";
import { WaterMeasurementsSection } from "@/components/tanks/WaterMeasurementsSection";
import { serverFetchBase } from "@/lib/api-base";
import { formatDateDE } from "@/lib/date";
import type { Tank, WaterTest, WaterTestsListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type LoadResult =
  | {
      kind: "ok";
      tank: Tank;
      lastMeasurementAt: string | null;
      waterTests: WaterTest[] | null;
    }
  | { kind: "not_found" }
  | { kind: "invalid_id" }
  | { kind: "error"; message: string };

async function loadTank(idStr: string): Promise<LoadResult> {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) {
    return { kind: "invalid_id" };
  }

  const base = serverFetchBase();
  let tankRes: Response;
  try {
    tankRes = await fetch(`${base}/v1/tanks/${id}`, {
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

  let lastMeasurementAt: string | null = null;
  let waterTests: WaterTest[] | null = null;
  try {
    const wtRes = await fetch(`${base}/v1/tanks/${id}/water-tests`, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    if (wtRes.ok) {
      const data = (await wtRes.json()) as WaterTestsListResponse;
      const list = Array.isArray(data.water_tests) ? data.water_tests : [];
      waterTests = list;
      lastMeasurementAt = list[0]?.created_at ?? null;
    }
  } catch {
    waterTests = null;
    lastMeasurementAt = null;
  }

  return { kind: "ok", tank, lastMeasurementAt, waterTests };
}

type RouteParams = { params: Promise<{ id: string }> };

export default async function TankDetailPage({ params }: RouteParams) {
  const { id } = await params;
  const result = await loadTank(id);

  return (
    <>
      <DashboardNav active="tanks" />
      <main id="main-content">
        <PageContainer className="flex min-h-0 flex-col gap-6 md:gap-8">
          <Link
            href="/dashboard/tanks"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-aqua-blue underline decoration-aqua-blue/40 underline-offset-2"
          >
            ← Zurück zur Beckenliste
          </Link>

          {result.kind === "invalid_id" ? (
            <NotFoundPanel reason="Ungültige Becken-ID." />
          ) : result.kind === "not_found" ? (
            <NotFoundPanel reason="Becken nicht gefunden." />
          ) : result.kind === "error" ? (
            <ErrorPanel message={result.message} />
          ) : (
            <TankDetail
              tank={result.tank}
              lastMeasurementAt={result.lastMeasurementAt}
              waterTests={result.waterTests}
            />
          )}
        </PageContainer>
      </main>
    </>
  );
}

function TankDetail({
  tank,
  lastMeasurementAt,
  waterTests,
}: {
  tank: Tank;
  lastMeasurementAt: string | null;
  waterTests: WaterTest[] | null;
}) {
  const lastDate = formatDateDE(lastMeasurementAt);
  const createdDate = formatDateDE(tank.created_at);
  const notes = tank.notes?.trim();

  return (
    <>
      <header className="space-y-2">
        <p className="text-sm font-medium text-aqua-deep">Becken</p>
        <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep md:text-3xl">
          {tank.name}
        </h1>
        <p className="text-sm text-aqua-deep/75 md:text-base">
          {tank.volume_liters} l · ID {tank.id}
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-6">
          <section
            className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card sm:p-5"
            aria-label="Becken-Details"
          >
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 md:gap-x-6 md:gap-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
              Volumen
            </dt>
            <dd className="mt-0.5 text-aqua-deep">{tank.volume_liters} l</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
              Letzte Messung
            </dt>
            <dd className="mt-0.5 text-aqua-deep">
              {lastDate ?? "—"}
            </dd>
          </div>
          {createdDate ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
                Angelegt
              </dt>
              <dd className="mt-0.5 text-aqua-deep">{createdDate}</dd>
            </div>
          ) : null}
          {notes ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-aqua-deep/55">
                Notizen
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-aqua-deep">{notes}</dd>
            </div>
          ) : null}
            </dl>
          </section>

          <WaterMeasurementsSection tankId={tank.id} waterTests={waterTests} />
        </div>

        <aside className="mt-8 space-y-3 lg:mt-0" aria-label="Aktionen">
          <section className="space-y-3 rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card sm:p-5">
            <h2 className="text-sm font-semibold text-aqua-deep">Aktionen</h2>
            <Link
              href={`/dashboard/tanks/${tank.id}/edit`}
              className="flex min-h-[44px] w-full items-center justify-center rounded-button border border-aqua-blue bg-white px-4 py-3 text-center text-sm font-semibold text-aqua-deep hover:bg-aqua-soft"
            >
              Becken bearbeiten
            </Link>
            <DeleteTankDialog tankId={tank.id} tankName={tank.name} />
          </section>
        </aside>
      </div>
    </>
  );
}

function NotFoundPanel({ reason }: { reason: string }) {
  return (
    <section className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card">
      <h1 className="text-base font-semibold text-aqua-deep">{reason}</h1>
      <p className="mt-2 text-sm text-aqua-deep/75">
        Das gewünschte Becken existiert nicht (mehr).
      </p>
      <Link
        href="/dashboard/tanks"
        className="mt-4 inline-block rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA]"
      >
        Zur Beckenliste
      </Link>
    </section>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <section
      role="alert"
      className="rounded-card border border-status-warning/50 bg-status-warning/15 p-4 shadow-card"
    >
      <h1 className="text-base font-semibold text-aqua-deep">
        Becken konnte nicht geladen werden
      </h1>
      <p className="mt-2 text-sm text-aqua-deep/85">{message}</p>
      <Link
        href="/dashboard/tanks"
        className="mt-4 inline-block rounded-button border border-aqua-blue bg-white px-4 py-3 text-sm font-semibold text-aqua-deep hover:bg-aqua-soft"
      >
        Zur Beckenliste
      </Link>
    </section>
  );
}
