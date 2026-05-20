import {
  bootstrapPortalFromClient,
  fetchPortalState,
  fetchPortalVersion,
  putPortalKvAdmin,
  putPortalKvUser,
} from "../api/portalApi";
import {
  PORTAL_KV,
  PORTAL_KV_EVENTS,
  PORTAL_LOCAL_KEYS,
  PORTAL_STATE_SYNCED_EVENT,
  type PortalKvKey,
} from "../config/portalKeys";
import { isAuthApiEnabled } from "./authMode";

const VERSION_KEY = "trassa-portal-state-version";

/** Интервал опроса, когда вкладка активна (~2–5 с до появления изменений на другом ПК). */
export const PORTAL_SYNC_POLL_VISIBLE_MS = 3_000;
/** Реже, когда окно свёрнуто или вкладка в фоне. */
export const PORTAL_SYNC_POLL_HIDDEN_MS = 12_000;

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

function storePortalVersion(version: string | null): void {
  if (version) {
    localStorage.setItem(VERSION_KEY, version);
  }
}

function applyFullPortalState(data: Record<string, unknown>, version: string | null): void {
  for (const key of Object.values(PORTAL_KV)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      applyKvToLocal(key, data[key]);
    }
  }
  storePortalVersion(version);
  window.dispatchEvent(new CustomEvent(PORTAL_STATE_SYNCED_EVENT));
}

let portalRefreshInFlight: Promise<boolean> | null = null;

/** Скачать состояние с сервера в localStorage (все клиенты видят одно и то же). */
export async function refreshPortalStateFromServer(): Promise<boolean> {
  if (!isPortalSyncEnabled()) return false;
  if (portalRefreshInFlight) return portalRefreshInFlight;

  portalRefreshInFlight = (async () => {
    const prevVersion = localStorage.getItem(VERSION_KEY);
    const ver = await fetchPortalVersion();
    if (ver.ok && prevVersion && prevVersion === (ver.version ?? "")) {
      return true;
    }

    const res = await fetchPortalState();
    if (!res.ok) return false;

    if (prevVersion === (res.version ?? "")) {
      storePortalVersion(res.version);
      return true;
    }

    applyFullPortalState(res.data, res.version);
    return true;
  })();

  try {
    return await portalRefreshInFlight;
  } finally {
    portalRefreshInFlight = null;
  }
}

function notePortalVersionFromPut(version: string | null): void {
  if (version) {
    storePortalVersion(version);
  }
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
      notePortalVersionFromPut(result.version);
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
    notePortalVersionFromPut(result.version);
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
