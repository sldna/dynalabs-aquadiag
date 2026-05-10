import { DiagnoseForm } from "@/components/DiagnoseForm";
import { PageContainer } from "@/components/layout";
import { serverFetchBase } from "@/lib/api-base";
import type { Tank, TanksListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type TanksLoadResult =
  | { ok: true; tanks: Tank[] }
  | { ok: false; tanks: Tank[]; message: string };

async function loadTanks(): Promise<TanksLoadResult> {
  try {
    const res = await fetch(`${serverFetchBase()}/v1/tanks`, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        tanks: [],
        message: `Die API antwortete mit HTTP ${res.status}. Bitte Verbindung und Backend prüfen.`,
      };
    }
    const data = (await res.json()) as TanksListResponse;
    const tanks = Array.isArray(data.tanks) ? data.tanks : [];
    return { ok: true, tanks };
  } catch (err) {
    return {
      ok: false,
      tanks: [],
      message:
        err instanceof Error
          ? err.message
          : "Netzwerkfehler beim Laden der Beckenliste.",
    };
  }
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
  const tanksResult = await loadTanks();
  const params = await searchParams;
  const initialTankId = pickTankId(params.tank);

  return (
    <PageContainer variant="readable">
      <header className="space-y-2">
        <p className="text-sm font-medium text-aqua-deep">Dynalabs AquaDiag v1</p>
        <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep">
          Diagnose
        </h1>
        <p className="text-sm text-aqua-deep/75">
          Symptome und/oder Messwerte erfassen, dann Regelengine ausführen.
        </p>
      </header>

      {!tanksResult.ok ? (
        <section
          role="alert"
          className="rounded-card border border-status-warning/50 bg-status-warning/15 p-4 text-sm text-aqua-deep shadow-card"
          aria-label="Hinweis Beckenliste"
        >
          <p className="font-semibold text-aqua-deep">
            Beckenliste konnte nicht geladen werden
          </p>
          <p className="mt-2 text-aqua-deep/90">{tanksResult.message}</p>
          <p className="mt-2 text-aqua-deep/85">
            Du kannst weiterhin unter „Neu anlegen“ ein Becken erfassen oder die
            Seite später erneut laden.
          </p>
        </section>
      ) : null}

      <DiagnoseForm
        initialTanks={tanksResult.tanks}
        initialTankId={initialTankId}
      />
    </PageContainer>
  );
}
