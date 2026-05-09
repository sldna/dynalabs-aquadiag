/**
 * Format an ISO/RFC3339 date string in compact German "DD.MM.YYYY" form.
 *
 * Falls back to the raw input on parse failure so the UI never crashes
 * if the backend ships an unexpected timestamp shape.
 */
export function formatDateDE(isoLike: string | null | undefined): string | null {
  const parsed = parseBackendDate(isoLike);
  if (!parsed) return null;
  if (Number.isNaN(parsed.date.getTime())) return parsed.raw;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(parsed.date);
}

/**
 * Kompaktes deutsches Datum mit Uhrzeit (kurz), lokale Zeitzone.
 */
export function formatDateTimeDE(isoLike: string | null | undefined): string | null {
  const parsed = parseBackendDate(isoLike);
  if (!parsed) return null;
  if (Number.isNaN(parsed.date.getTime())) return parsed.raw;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(parsed.date);
}

const APP_TIME_ZONE = "Europe/Berlin";
const SQLITE_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function parseBackendDate(
  isoLike: string | null | undefined,
): { date: Date; raw: string } | null {
  if (!isoLike) return null;
  const trimmed = isoLike.trim();
  if (trimmed === "") return null;
  const normalized = SQLITE_UTC_TIMESTAMP.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;
  return { date: new Date(normalized), raw: trimmed };
}
