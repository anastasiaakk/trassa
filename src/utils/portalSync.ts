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
  PORTAL_PUT_ADMIN_KEYS,
  PORTAL_STATE_SYNCED_EVENT,
  type PortalKvKey,
} from "../config/portalKeys";
import { applyPortalDesign, type PortalDesignId } from "../design-system/portalDesign";
import { applyDesignTokens, parseDesignTokens } from "../design-system/portalDesignTokens";
import { getAdminApiToken } from "../api/adminApi";
import { getStoredAccessToken } from "../api/authApi";
import { isAuthApiEnabled } from "./authMode";

const VERSION_KEY = "trassa-portal-state-version";
/** public = /api/portal/state, auth = полный state-auth (нужен вход). */
const SCOPE_KEY = "trassa-portal-sync-scope";

type PortalSyncScope = "public" | "auth";

function getPortalSyncScope(): PortalSyncScope {
  if (getAdminApiToken() || getStoredAccessToken()) return "auth";
  return "public";
}

/** Интервал опроса, когда вкладка активна (сначала /version, при изменении — полный state). */
export const PORTAL_SYNC_POLL_VISIBLE_MS = 3_000;
/** Реже, когда окно свёрнуто или вкладка в фоне. */
export const PORTAL_SYNC_POLL_HIDDEN_MS = 15_000;

export function isPortalSyncEnabled(): boolean {
  return isAuthApiEnabled();
}

function normalizePortalDesignValue(value: unknown): PortalDesignId | null {
  if (value === "v2" || value === "legacy") return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed === "v2" || parsed === "legacy") return parsed;
    } catch {
      if (value === '"v2"' || value === '"legacy"') {
        return value.slice(1, -1) as PortalDesignId;
      }
    }
  }
  return null;
}

function applyKvToLocal(key: PortalKvKey, value: unknown): void {
  const localKey = PORTAL_LOCAL_KEYS[key];
  try {
    if (key === PORTAL_KV.PORTAL_DESIGN) {
      const design = normalizePortalDesignValue(value);
      if (design) {
        localStorage.setItem(localKey, design);
        applyPortalDesign(design);
      } else {
        localStorage.setItem(localKey, JSON.stringify(value));
      }
    } else if (key === PORTAL_KV.DESIGN_TOKENS) {
      const tokens = parseDesignTokens(value);
      if (tokens) {
        localStorage.setItem(localKey, JSON.stringify(tokens));
        applyDesignTokens(tokens);
      } else {
        localStorage.setItem(localKey, JSON.stringify(value));
      }
    } else {
      localStorage.setItem(localKey, JSON.stringify(value));
    }
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
export async function refreshPortalStateFromServer(options?: { force?: boolean }): Promise<boolean> {
  if (!isPortalSyncEnabled()) return false;
  if (portalRefreshInFlight) return portalRefreshInFlight;

  portalRefreshInFlight = (async () => {
    const scope = getPortalSyncScope();
    const prevVersion = localStorage.getItem(VERSION_KEY);
    const prevScope = localStorage.getItem(SCOPE_KEY) as PortalSyncScope | null;
    const ver = await fetchPortalVersion();
    if (!ver.ok) return false;

    const versionUnchanged =
      Boolean(prevVersion) && prevVersion === (ver.version ?? "");
    const scopeUnchanged = prevScope === scope;

    if (!options?.force && versionUnchanged && scopeUnchanged) {
      return true;
    }

    const res = await fetchPortalState();
    if (!res.ok) return false;

    if (!options?.force && prevVersion === (res.version ?? "") && prevScope === scope) {
      storePortalVersion(res.version);
      localStorage.setItem(SCOPE_KEY, res.includesAdminKeys ? "auth" : "public");
      return true;
    }

    applyFullPortalState(res.data, res.version);
    localStorage.setItem(SCOPE_KEY, res.includesAdminKeys ? "auth" : scope);
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
    const result = PORTAL_PUT_ADMIN_KEYS.has(key)
      ? await putPortalKvAdmin(key, value)
      : await putPortalKvUser(key, value);
    if (result.ok) {
      notePortalVersionFromPut(result.version);
      void refreshPortalStateFromServer();
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

  const result = PORTAL_PUT_ADMIN_KEYS.has(key)
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
