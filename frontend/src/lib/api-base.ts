/** Öffentliche API-Basis (Browser). */
export function trimSlash(s: string): string {
  return s.replace(/\/$/, "");
}

export function publicApiBase(): string {
  return trimSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080");
}

/**
 * Basis-URL für Browser-Fetches (Client Components): Proxy unter gleicher Origin.
 * Vermeidet CORS und harte NEXT_PUBLIC_API_BASE_URLs zum Host-Backend.
 */
export function browserApiBase(): string {
  return "/api/backend";
}

/** Server-Fetch (Compose: Backend-Service). */
export function serverFetchBase(): string {
  const internal = process.env.API_INTERNAL_BASE_URL;
  if (internal !== undefined && internal.trim() !== "") {
    return trimSlash(internal.trim());
  }
  return publicApiBase();
}
