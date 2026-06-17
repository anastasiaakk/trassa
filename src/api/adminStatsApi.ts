import { getApiBase } from "./authApi";
import { getAdminApiToken } from "./adminApi";
import { fetchWithTimeout } from "./fetchWithTimeout";

export type AdminStatsPayload = {
  days: number;
  registrations: { labels: string[]; values: number[]; totalUsers: number };
  incidents: { labels: string[]; values: number[]; totalIncidents: number };
};

export type AdminIncidentRecord = {
  id: string;
  kind: "error" | "crash" | "rejection";
  message: string;
  createdAt: string;
};

export async function fetchAdminStats(
  days = 14
): Promise<{ ok: true; stats: AdminStatsPayload } | { ok: false; error: string }> {
  const base = getApiBase();
  const token = getAdminApiToken();
  if (!token) {
    return { ok: false, error: "Нет токена администратора." };
  }
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/stats?days=${days}`, {
      headers: { "X-Trassa-Admin-Token": token },
      credentials: "include",
    });
    const body = (await res.json()) as AdminStatsPayload & { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: (body as { error?: string }).error ?? res.statusText };
    }
    return {
      ok: true,
      stats: {
        days: body.days ?? days,
        registrations: body.registrations,
        incidents: body.incidents,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function fetchAdminIncidents(
  limit = 100
): Promise<{ ok: true; events: AdminIncidentRecord[] } | { ok: false; error: string }> {
  const base = getApiBase();
  const token = getAdminApiToken();
  if (!token) {
    return { ok: false, error: "Нет токена администратора." };
  }
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/incidents?limit=${limit}`, {
      headers: { "X-Trassa-Admin-Token": token },
      credentials: "include",
    });
    const body = (await res.json()) as {
      ok?: boolean;
      error?: string;
      events?: AdminIncidentRecord[];
    };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, events: Array.isArray(body.events) ? body.events : [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function clearAdminIncidents(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  const base = getApiBase();
  const token = getAdminApiToken();
  if (!token) {
    return { ok: false, error: "Нет токена администратора." };
  }
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/incidents`, {
      method: "DELETE",
      headers: { "X-Trassa-Admin-Token": token },
      credentials: "include",
    });
    const body = (await res.json()) as { ok?: boolean; deleted?: number; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, deleted: typeof body.deleted === "number" ? body.deleted : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
