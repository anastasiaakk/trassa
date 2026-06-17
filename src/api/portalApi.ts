import { getApiBase, getStoredAccessToken } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { PortalKvKey } from "../config/portalKeys";
import { buildPortalVersionQuery, GATE_HOLD_CODE } from "../utils/portalClientSession";
import { applyPortalGateHold } from "../utils/portalGate";

export type PortalStateResponse = {
  ok: boolean;
  data: Record<string, unknown>;
  version: string | null;
  scope?: "public" | "auth";
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

const VERSION_FETCH_TIMEOUT_MS = 8_000;
const STATE_FETCH_TIMEOUT_MS = 20_000;

function isGateHoldCode(code: unknown): boolean {
  return code === GATE_HOLD_CODE || code === "DEVICE_BANNED";
}

export async function fetchPortalVersion(): Promise<
  { ok: true; version: string | null; gateHold: boolean } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/portal/version${buildPortalVersionQuery()}`,
      { credentials: "include", cache: "no-store" },
      VERSION_FETCH_TIMEOUT_MS
    );
    const body = (await res.json()) as {
      ok?: boolean;
      version?: string | null;
      h?: number;
      error?: string;
      code?: string;
    };
    if (res.status === 403 && isGateHoldCode(body.code)) {
      applyPortalGateHold(true);
      return { ok: true, version: null, gateHold: true };
    }
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    const gateHold = body.h === 1;
    applyPortalGateHold(gateHold);
    return { ok: true, version: body.version ?? null, gateHold };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function fetchPortalKv(
  key: PortalKvKey
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/portal/kv/${key}`,
      { credentials: "include", cache: "no-store" },
      VERSION_FETCH_TIMEOUT_MS
    );
    const body = (await res.json()) as { ok?: boolean; value?: unknown; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, value: body.value ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function fetchPortalState(): Promise<
  | { ok: true; data: Record<string, unknown>; version: string | null; includesAdminKeys: boolean }
  | { ok: false; error: string }
> {
  const base = getApiBase();
  const tryFetchState = async (path: "/api/portal/state-auth" | "/api/portal/state") => {
    const res = await fetchWithTimeout(
      `${base}${path}`,
      {
        credentials: "include",
        cache: "no-store",
      },
      STATE_FETCH_TIMEOUT_MS
    );
    const body = (await res.json()) as PortalStateResponse & { error?: string };
    return { res, body };
  };

  try {
    const authFirst = await tryFetchState("/api/portal/state-auth");
    if (authFirst.res.ok && authFirst.body.ok) {
      return {
        ok: true,
        data: authFirst.body.data,
        version: authFirst.body.version ?? null,
        includesAdminKeys: true,
      };
    }
    const pub = await tryFetchState("/api/portal/state");
    if (!pub.res.ok || !pub.body.ok) {
      return { ok: false, error: pub.body.error ?? pub.res.statusText };
    }
    return {
      ok: true,
      data: pub.body.data,
      version: pub.body.version ?? null,
      includesAdminKeys: false,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function putPortalKvAdmin(
  key: PortalKvKey,
  value: unknown
): Promise<{ ok: true; version: string | null } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/portal/kv/${key}`,
      {
        method: "PUT",
        credentials: "include",
        headers: adminHeaders(),
        body: JSON.stringify({ value }),
      },
      STATE_FETCH_TIMEOUT_MS
    );
    const body = (await res.json()) as { ok?: boolean; version?: string | null; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, version: body.version ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function putPortalKvUser(
  key: PortalKvKey,
  value: unknown
): Promise<{ ok: true; version: string | null } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/portal/user-kv/${key}`,
      {
        method: "PUT",
        credentials: "include",
        headers: adminHeaders(),
        body: JSON.stringify({ value }),
      },
      STATE_FETCH_TIMEOUT_MS
    );
    const body = (await res.json()) as { ok?: boolean; version?: string | null; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, version: body.version ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function bootstrapPortalFromClient(
  data: Record<string, unknown>
): Promise<{ ok: true; imported: number } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/portal/bootstrap`,
      {
        method: "POST",
        credentials: "include",
        headers: adminHeaders(),
        body: JSON.stringify({ data }),
      },
      STATE_FETCH_TIMEOUT_MS
    );
    const body = (await res.json()) as { ok?: boolean; imported?: number; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, imported: body.imported ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
