import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { getAdminApiToken } from "./adminApi";
import { fetchPortalVersion } from "./portalApi";

export const DEVICE_BAN_MESSAGE =
  "Сервис временно недоступен. Попробуйте позже или обратитесь к администратору организации.";

export const DEVICE_BAN_CODE = "GATE_HOLD";
export const LEGACY_DEVICE_BAN_CODE = "DEVICE_BANNED";

export const DEVICE_BAN_EVENT = "pv2-gate-hold";

export {
  readGateCache as readCachedDeviceBan,
  writeGateCache as writeCachedDeviceBan,
} from "../utils/portalClientSession";

export type PortalDeviceRecord = {
  id: string;
  label: string;
  displayLabel?: string;
  displayModel?: string;
  userAgent: string;
  ipLast: string;
  userId: string | null;
  userEmail: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  banned: boolean;
  bannedAt: string | null;
  bannedBy: string | null;
  adminNote: string;
  visitCount: number;
  personal?: boolean;
  geoLat?: number | null;
  geoLng?: number | null;
  geoAccuracyM?: number | null;
  geoUpdatedAt?: string | null;
};

export type PortalDeviceLocation = {
  lat: number;
  lng: number;
  accuracyM: number;
  updatedAt: string | null;
  source: "gps" | "ip";
  ip?: string;
  placeLabel?: string;
};

export type PortalDeviceVisitRecord = {
  id: string;
  deviceId: string;
  seenAt: string;
  ip: string;
  userId: string | null;
  userEmail: string | null;
};

import { writeGateCache } from "../utils/portalClientSession";
import { applyPortalGateHold } from "../utils/portalGate";

export function notifyDeviceBanned(message = DEVICE_BAN_MESSAGE): void {
  if (typeof window === "undefined") return;
  writeGateCache(true);
  applyPortalGateHold(true, message);
  window.dispatchEvent(
    new CustomEvent(DEVICE_BAN_EVENT, { detail: { message } })
  );
}

/** Проверка доступа — через обычный /api/portal/version (без отдельного endpoint). */
export async function resolvePortalDeviceAccess(): Promise<{
  banned: boolean;
  message: string;
}> {
  const { ensureDeviceLabelResolved } = await import("../utils/deviceId");
  await Promise.race([
    ensureDeviceLabelResolved(),
    import("../utils/deviceModelResolveClient").then((m) => m.ensureDeviceModelResolved()),
    new Promise<void>((resolve) => window.setTimeout(resolve, 2_800)),
  ]);
  const r = await fetchDeviceAccessStatus();
  if (r.ok && r.banned) {
    return { banned: true, message: DEVICE_BAN_MESSAGE };
  }
  return { banned: false, message: DEVICE_BAN_MESSAGE };
}

export async function fetchDeviceAccessStatus(): Promise<{
  ok: boolean;
  banned: boolean;
  registered: boolean;
}> {
  const ver = await fetchPortalVersion();
  if (!ver.ok) {
    return { ok: false, banned: false, registered: false };
  }
  return {
    ok: true,
    banned: ver.gateHold,
    registered: true,
  };
}

function adminFetchHeaders(): Record<string, string> {
  const adminToken = getAdminApiToken();
  return adminToken ? { "X-Trassa-Admin-Token": adminToken } : {};
}

export async function adminListDevices(): Promise<
  { ok: true; devices: PortalDeviceRecord[] } | { ok: false; error: string }
> {
  const adminToken = getAdminApiToken();
  if (!adminToken) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/devices`, {
      credentials: "include",
      headers: adminFetchHeaders(),
      cache: "no-store",
    });
    const body = (await res.json()) as {
      ok?: boolean;
      devices?: PortalDeviceRecord[];
      error?: string;
    };
    if (!res.ok || !body.ok || !Array.isArray(body.devices)) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, devices: body.devices };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminGetDeviceLocation(
  deviceId: string
): Promise<
  | { ok: true; location: PortalDeviceLocation | null; hint?: string }
  | { ok: false; error: string }
> {
  const adminToken = getAdminApiToken();
  if (!adminToken) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/admin/devices/${encodeURIComponent(deviceId)}/location`,
      {
        credentials: "include",
        headers: adminFetchHeaders(),
        cache: "no-store",
      }
    );
    const body = (await res.json()) as {
      ok?: boolean;
      location?: PortalDeviceLocation | null;
      hint?: string;
      error?: string;
    };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      location: body.location ?? null,
      hint: body.hint,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminListDeviceVisits(
  deviceId: string
): Promise<
  { ok: true; visits: PortalDeviceVisitRecord[] } | { ok: false; error: string }
> {
  const adminToken = getAdminApiToken();
  if (!adminToken) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/admin/devices/${encodeURIComponent(deviceId)}/visits`,
      {
        credentials: "include",
        headers: adminFetchHeaders(),
        cache: "no-store",
      }
    );
    const body = (await res.json()) as {
      ok?: boolean;
      visits?: PortalDeviceVisitRecord[];
      error?: string;
    };
    if (!res.ok || !body.ok || !Array.isArray(body.visits)) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, visits: body.visits };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminPatchDevice(
  deviceId: string,
  patch: { banned?: boolean; note?: string; personal?: boolean }
): Promise<{ ok: true; affected: number } | { ok: false; error: string }> {
  const adminToken = getAdminApiToken();
  if (!adminToken) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/admin/devices/${encodeURIComponent(deviceId)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...adminFetchHeaders(),
        },
        body: JSON.stringify(patch),
      }
    );
    const body = (await res.json()) as { ok?: boolean; error?: string; affected?: number };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, affected: typeof body.affected === "number" ? body.affected : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminSetDeviceBanned(
  deviceId: string,
  banned: boolean
): Promise<{ ok: true; affected: number } | { ok: false; error: string }> {
  return adminPatchDevice(deviceId, { banned });
}

export async function adminSaveDeviceNote(
  deviceId: string,
  note: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await adminPatchDevice(deviceId, { note });
  if (!r.ok) return r;
  return { ok: true };
}

export async function adminSetDevicePersonal(
  deviceId: string,
  personal: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await adminPatchDevice(deviceId, { personal });
  if (!r.ok) return r;
  return { ok: true };
}

export async function adminDeleteDevice(
  deviceId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const adminToken = getAdminApiToken();
  if (!adminToken) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/admin/devices/${encodeURIComponent(deviceId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: adminFetchHeaders(),
      }
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
