import { getApiBase, getStoredAccessToken } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { PortalKvKey } from "../config/portalKeys";

export type PortalStateResponse = {
  ok: boolean;
  data: Record<string, unknown>;
  version: string | null;
};

export function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const adminToken = sessionStorage.getItem("trassa-admin-api-token");
    if (adminToken) {
      headers["X-Trassa-Admin-Token"] = adminToken;
    }
  } catch {
    /* ignore */
  }
  const userToken = getStoredAccessToken();
  if (userToken) {
    headers.Authorization = `Bearer ${userToken}`;
  }
  return headers;
}

export async function fetchPortalState(): Promise<
  { ok: true; data: Record<string, unknown>; version: string | null } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/portal/state`, {
      credentials: "include",
      cache: "no-store",
    });
    const body = (await res.json()) as PortalStateResponse & { error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, data: body.data ?? {}, version: body.version ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function putPortalKvAdmin(
  key: PortalKvKey,
  value: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/portal/kv/${key}`, {
      method: "PUT",
      credentials: "include",
      headers: adminHeaders(),
      body: JSON.stringify({ value }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function putPortalKvUser(
  key: PortalKvKey,
  value: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/portal/user-kv/${key}`, {
      method: "PUT",
      credentials: "include",
      headers: adminHeaders(),
      body: JSON.stringify({ value }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function bootstrapPortalFromClient(
  data: Record<string, unknown>
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/portal/bootstrap`, {
      method: "POST",
      credentials: "include",
      headers: adminHeaders(),
      body: JSON.stringify({ data }),
    });
    const body = (await res.json()) as { ok?: boolean; imported?: number; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, imported: body.imported ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
