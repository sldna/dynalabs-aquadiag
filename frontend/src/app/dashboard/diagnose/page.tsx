import { DiagnoseForm } from "@/components/DiagnoseForm";
import { DashboardNav } from "@/components/DashboardNav";
import { serverFetchBase } from "@/lib/api-base";
import type { Tank, TanksListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadTanks(): Promise<Tank[]> {
  const res = await fetch(`${serverFetchBase()}/v1/tanks`, {
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as TanksListResponse;
  return Array.isArray(data.tanks) ? data.tanks : [];
}

type SearchParams = Promise<{ tank?: string | string[] }>;

function pickTankId(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
}

export default async function DiagnosePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const tanks = await loadTanks();
  const params = await searchParams;
  const initialTankId = pickTankId(params.tank);

  return (
    <>
      <DashboardNav active="diagnose" />
      <main className="mx-auto flex min-h-0 w-full max-w-[920px] flex-col gap-6 px-4 py-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-aqua-deep">Dynalabs AquaDiag v1</p>
          <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep">
            Diagnose
          </h1>
          <p className="text-sm text-aqua-deep/75">
            Symptome und/oder Messwerte erfassen, dann Regelengine ausführen.
          </p>
        </header>

        <DiagnoseForm initialTanks={tanks} initialTankId={initialTankId} />
      </main>
    </>
  );
}
