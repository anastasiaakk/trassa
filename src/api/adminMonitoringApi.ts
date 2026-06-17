import { getApiBase } from "./authApi";
import { getAdminApiToken } from "./adminApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { DailySeries } from "../utils/adminChartData";

export type AdminStatsResponse = {
  days: number;
  registrations: DailySeries;
  incidents: DailySeries;
};

export type AdminIncidentEvent = {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
};

export async function fetchAdminStats(
  days = 14,
): Promise<{ ok: true; stats: AdminStatsResponse } | { ok: false; error: string }> {
  const base = getApiBase();
  const token = getAdminApiToken();
  if (!token) return { ok: false, error: "Нет токена администратора." };
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/stats?days=${days}`, {
      headers: { "X-Trassa-Admin-Token": token },
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
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
  limit = 100,
): Promise<{ ok: true; events: AdminIncidentEvent[] } | { ok: false; error: string }> {
  const base = getApiBase();
  const token = getAdminApiToken();
  if (!token) return { ok: false, error: "Нет токена администратора." };
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/incidents?limit=${limit}`, {
      headers: { "X-Trassa-Admin-Token": token },
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      events: Array.isArray(body.events) ? body.events : [],
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function clearAdminIncidents(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  const base = getApiBase();
  const token = getAdminApiToken();
  if (!token) return { ok: false, error: "Нет токена администратора." };
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/incidents`, {
      method: "DELETE",
      headers: { "X-Trassa-Admin-Token": token },
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, deleted: typeof body.deleted === "number" ? body.deleted : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
