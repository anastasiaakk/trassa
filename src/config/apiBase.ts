/** Общий production API (desktop file:// и fallback). */
export const PORTAL_PRODUCTION_ORIGIN = "https://trassa.duckdns.org";

export function envApiBase(): string {
  return (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
}

/** База URL API: env → same-origin (web) → production (desktop). */
export function resolveApiBase(): string {
  const env = envApiBase();
  if (env) return env;
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return PORTAL_PRODUCTION_ORIGIN;
  }
  return "";
}
