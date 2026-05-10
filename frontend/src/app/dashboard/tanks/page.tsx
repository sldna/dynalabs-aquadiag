import Link from "next/link";

import { TankCreateForm } from "@/components/TankCreateForm";
import { ContentGrid, PageContainer } from "@/components/layout";
import { TankCard } from "@/components/tanks/TankCard";
import { DeletedBanner } from "@/components/tanks/DeletedBanner";
import { serverFetchBase } from "@/lib/api-base";
import type { Tank, TanksListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

type LoadResult =
  | { kind: "ok"; tanks: Tank[] }
  | { kind: "error"; message: string };

async function loadTanks(): Promise<LoadResult> {
  const base = serverFetchBase();
  let res: Response;
  try {
    res = await fetch(`${base}/v1/tanks`, {
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
  if (!res.ok) {
    return { kind: "error", message: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as TanksListResponse;
  const tanks = Array.isArray(data.tanks) ? data.tanks : [];
  return { kind: "ok", tanks };
}

type SearchParams = Promise<{ deleted?: string | string[] }>;

export default async function TanksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const result = await loadTanks();
  const deletedRaw = params.deleted;
  const deletedName = Array.isArray(deletedRaw) ? deletedRaw[0] : deletedRaw;

  return (
    <PageContainer variant="wide">
      <header className="space-y-2">
        <p className="text-sm font-medium text-aqua-deep">Dynalabs AquaDiag v1</p>
        <h1 className="text-2xl font-semibold tracking-tight text-aqua-deep">
          Becken
        </h1>
        <p className="text-sm text-aqua-deep/75">
          Becken anlegen, öffnen, bearbeiten oder zur Diagnose verwenden.
        </p>
      </header>

      {deletedName ? <DeletedBanner name={deletedName} /> : null}

      <TankCreateForm />

      <section aria-label="Beckenliste" className="space-y-3">
        <h2 className="text-sm font-semibold text-aqua-deep">Ihre Becken</h2>
        {result.kind === "error" ? (
          <ErrorPanel message={result.message} />
        ) : result.tanks.length === 0 ? (
          <EmptyPanel />
        ) : (
          <ContentGrid className="lg:grid-cols-2 xl:grid-cols-3">
            {result.tanks.map((t) => (
              <TankCard key={t.id} tank={t} />
            ))}
          </ContentGrid>
        )}
      </section>

      <Link
        href="/dashboard/diagnose"
        className="block rounded-button bg-aqua-blue px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[#168EAA]"
      >
        Zur Diagnose
      </Link>
    </PageContainer>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-card border border-dashed border-aqua-deep/25 bg-white p-4 text-sm text-aqua-deep/75">
      Noch keine Becken. Oben ein neues anlegen oder direkt unter{" "}
      <Link href="/dashboard/diagnose" className="text-aqua-blue underline decoration-aqua-blue/40">
        Diagnose
      </Link>{" "}
      ein Schnell-Becken nutzen.
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-card border border-status-warning/50 bg-status-warning/15 p-4 text-sm text-aqua-deep shadow-card"
    >
      <p className="font-semibold text-aqua-deep">
        Becken konnten nicht geladen werden.
      </p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
