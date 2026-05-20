import { bootstrapPortalFromClient, fetchPortalState, putPortalKvAdmin, putPortalKvUser } from "../api/portalApi";
import {
  PORTAL_KV,
  PORTAL_KV_EVENTS,
  PORTAL_LOCAL_KEYS,
  PORTAL_STATE_SYNCED_EVENT,
  type PortalKvKey,
} from "../config/portalKeys";
import { isAuthApiEnabled } from "./authMode";

const VERSION_KEY = "trassa-portal-state-version";

const ADMIN_KEYS = new Set<PortalKvKey>([
  PORTAL_KV.MAINTENANCE,
  PORTAL_KV.SEASON_BG,
  PORTAL_KV.CONTRACTOR_ORGS,
  PORTAL_KV.MAP_CATEGORY_LABELS,
  PORTAL_KV.MAP_SUBJECT_ORGS,
]);

export function isPortalSyncEnabled(): boolean {
  return isAuthApiEnabled();
}

function applyKvToLocal(key: PortalKvKey, value: unknown): void {
  const localKey = PORTAL_LOCAL_KEYS[key];
  try {
    localStorage.setItem(localKey, JSON.stringify(value));
    const ev = PORTAL_KV_EVENTS[key];
    if (ev) {
      window.dispatchEvent(new CustomEvent(ev));
    }
  } catch {
    /* ignore quota */
  }
}

/** Скачать состояние с сервера в localStorage (все клиенты видят одно и то же). */
export async function refreshPortalStateFromServer(): Promise<boolean> {
  if (!isPortalSyncEnabled()) return false;
  const res = await fetchPortalState();
  if (!res.ok) return false;

  const prevVersion = localStorage.getItem(VERSION_KEY);
  if (prevVersion === (res.version ?? "")) {
    return true;
  }

  for (const key of Object.values(PORTAL_KV)) {
    if (Object.prototype.hasOwnProperty.call(res.data, key)) {
      applyKvToLocal(key, res.data[key]);
    }
  }
  if (res.version) {
    localStorage.setItem(VERSION_KEY, res.version);
  }
  window.dispatchEvent(new CustomEvent(PORTAL_STATE_SYNCED_EVENT));
  return true;
}

/** Записать в localStorage и на сервер (если включён API). */
export function pushPortalKv(key: PortalKvKey, value: unknown): void {
  applyKvToLocal(key, value);
  if (!isPortalSyncEnabled()) return;

  void (async () => {
    const result = ADMIN_KEYS.has(key)
      ? await putPortalKvAdmin(key, value)
      : await putPortalKvUser(key, value);
    if (result.ok) {
      await refreshPortalStateFromServer();
    } else {
      console.warn("[portal-sync] не сохранено на сервере:", key, result.error);
    }
  })();
}

/** Записать ключ и дождаться ответа API (для критичных админ-переключателей). */
export async function pushPortalKvWithAck(
  key: PortalKvKey,
  value: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  applyKvToLocal(key, value);
  if (!isPortalSyncEnabled()) return { ok: true };

  const result = ADMIN_KEYS.has(key)
    ? await putPortalKvAdmin(key, value)
    : await putPortalKvUser(key, value);
  if (result.ok) {
    await refreshPortalStateFromServer();
    return { ok: true };
  }
  console.warn("[portal-sync] не сохранено на сервере:", key, result.error);
  return result;
}

/** Однократно отправить все локальные ключи на сервер (из админки). */
export async function migrateLocalPortalStateToServer(): Promise<
  { ok: true; imported: number } | { ok: false; error: string }
> {
  if (!isPortalSyncEnabled()) {
    return { ok: false, error: "Включите VITE_USE_AUTH_API и запустите API." };
  }
  const data: Record<string, unknown> = {};
  for (const key of Object.values(PORTAL_KV)) {
    const raw = localStorage.getItem(PORTAL_LOCAL_KEYS[key]);
    if (!raw) continue;
    try {
      data[key] = JSON.parse(raw) as unknown;
    } catch {
      /* skip */
    }
  }
  const res = await bootstrapPortalFromClient(data);
  if (res.ok) {
    await refreshPortalStateFromServer();
  }
  return res;
}
