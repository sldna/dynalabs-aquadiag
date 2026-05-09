import type { ReactNode } from "react";
import { publicApiBase, serverFetchBase, trimSlash } from "@/lib/api-base";

type HealthJson = { status?: unknown };

function readStatus(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) {
    return undefined;
  }
  const s = (data as HealthJson).status;
  return typeof s === "string" ? s : undefined;
}

export async function BackendStatus() {
  const apiForBrowser = trimSlash(publicApiBase());
  const apiForFetch = serverFetchBase();
  const url = `${apiForFetch}/health`;

  let body: ReactNode;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      body = (
        <span className="text-status-alert">HTTP {String(res.status)}</span>
      );
    } else {
      const data: unknown = await res.json();
      if (readStatus(data) === "ok") {
        body = <span className="text-status-success">API erreichbar (ok)</span>;
      } else {
        body = (
          <span className="text-status-alert">
            Unerwartete Antwort von /health
          </span>
        );
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler";
    body = <span className="text-status-alert">Nicht erreichbar: {message}</span>;
  }

  return (
    <section
      className="rounded-card border border-aqua-deep/10 bg-white p-4 shadow-card"
      aria-live="polite"
    >
      <h2 className="text-sm font-semibold text-aqua-deep">Backend</h2>
      <p className="mt-2 text-sm text-aqua-deep/75">{body}</p>
      <p className="mt-1 text-xs text-aqua-deep/55">
        Öffentliche API (Anzeige): {apiForBrowser}
        <br />
        Formulare im Browser nutzen den internen Pfad{" "}
        <code className="rounded bg-aqua-soft px-1 text-aqua-deep/90">
          /api/backend
        </code>{" "}
        (Proxy, kein CORS).
        {apiForFetch !== apiForBrowser && (
          <>
            <br />
            Server-Fetch: {apiForFetch}
          </>
        )}
      </p>
    </section>
  );
}
