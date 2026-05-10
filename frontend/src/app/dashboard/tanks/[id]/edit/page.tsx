import Link from "next/link";

import { DashboardNav } from "@/components/DashboardNav";
import { PageContainer } from "@/components/layout";
import { TankEditForm } from "@/components/tanks/TankEditForm";
import { serverFetchBase } from "@/lib/api-base";
import type { Tank } from "@/lib/types";

export const dynamic = "force-dynamic";

type LoadResult =
  | { kind: "ok"; tank: Tank }
  | { kind: "not_found" }
  | { kind: "invalid_id" }
  | { kind: "error"; message: string };

async function loadTank(idStr: string): Promise<LoadResult> {
  const id = Number(idStr);
  if (!Number.isInteger(id) || id < 1) {
    return { kind: "invalid_id" };
  }
  try {
    const res = await fetch(`${serverFetchBase()}/v1/tanks/${id}`, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) return { kind: "error", message: `HTTP ${res.status}` };
    const tank = (await res.json()) as Tank;
    return { kind: "ok", tank };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Netzwerkfehler",
    };
  }
}

type RouteParams = { params: Promise<{ id: string }> };

export default async function TankEditPage({ params }: RouteParams) {
  const { id } = await params;
  const result = await loadTank(id);

  return (
    <>
      <DashboardNav active="tanks" />
      <main id="main-content">
        <PageContainer className="flex min-h-0 flex-col gap-6 md:gap-8">
          <Link
            href={
              result.kind === "ok"
                ? `/dashboard/tanks/${result.tank.id}`
                : "/dashboard/tanks"
            }
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-aqua-blue underline decoration-aqua-blue/40 underline-offset-2"
          >
            ← Abbrechen
          </Link>

          {result.kind === "ok" ? (
            <>
              <header className="space-y-2">
                <p className="text-sm font-medium text-aqua-deep">Becken bearbeiten</p>
                <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep md:text-3xl">
                  {result.tank.name}
                </h1>
              </header>
              <div className="max-w-2xl">
                <TankEditForm tank={result.tank} />
              </div>
            </>
          ) : result.kind === "invalid_id" || result.kind === "not_found" ? (
            <section className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card sm:p-5">
              <h1 className="text-base font-semibold text-aqua-deep">
                {result.kind === "invalid_id"
                  ? "Ungültige Becken-ID."
                  : "Becken nicht gefunden."}
              </h1>
              <Link
                href="/dashboard/tanks"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-button bg-aqua-blue px-4 py-3 text-sm font-semibold text-white hover:bg-[#168EAA]"
              >
                Zur Beckenliste
              </Link>
            </section>
          ) : (
            <section
              role="alert"
              className="rounded-card border border-status-warning/50 bg-status-warning/15 p-4 shadow-card"
            >
              <h1 className="text-base font-semibold text-aqua-deep">
                Becken konnte nicht geladen werden
              </h1>
              <p className="mt-2 text-sm text-aqua-deep/85">{result.message}</p>
            </section>
          )}
        </PageContainer>
      </main>
    </>
  );
}
