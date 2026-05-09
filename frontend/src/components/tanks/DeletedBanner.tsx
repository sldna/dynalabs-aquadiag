"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type DeletedBannerProps = {
  name: string;
};

/**
 * Inline success banner shown on the tanks list after a deletion.
 *
 * Mounts only when the page renders with `?deleted=…`; on unmount or
 * dismissal it removes the query param so a refresh does not show
 * the banner again. There is no global toast system in V1.
 */
export function DeletedBanner({ name }: DeletedBannerProps) {
  const router = useRouter();

  useEffect(() => {
    const t = window.setTimeout(() => {
      clearQueryParam(router);
    }, 6_000);
    return () => window.clearTimeout(t);
  }, [router]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start justify-between gap-3 rounded-card border border-status-success/35 bg-status-success/10 p-3 text-sm text-aqua-deep shadow-card"
    >
      <p>
        Becken <span className="font-semibold">{name}</span> wurde gelöscht.
      </p>
      <button
        type="button"
        aria-label="Hinweis schließen"
        onClick={() => clearQueryParam(router)}
        className="rounded-md px-2 text-aqua-deep hover:bg-status-success/15"
      >
        ×
      </button>
    </div>
  );
}

function clearQueryParam(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("deleted")) return;
  url.searchParams.delete("deleted");
  router.replace(`${url.pathname}${url.search}`);
}
