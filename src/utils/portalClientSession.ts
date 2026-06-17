/**
 * Клиентская сессия портала — нейтральные имена (без device / tracking в network).
 * Сервер: server/src/portalClientSession.ts
 */

import { getTrassaDeviceId, buildClientSessionContextPayload } from "./deviceId";
import { hasPortalPrivacyConsent } from "./portalPrivacyConsent";

export const SESSION_COOKIE_NAME = "pv2_s";
export const SESSION_BUNDLE_QUERY = "k";

/** Opaque storage (не читаются как «device id»). */
export const LEGACY_STORAGE_ID = "trassa_device_id";
export const LEGACY_STORAGE_ID_V2 = "pv2_csid_v1";
export const STORAGE_ID = "_p_ls0";
export const LEGACY_STORAGE_LABEL = "trassa_device_label_v8";
export const STORAGE_LABEL = "_p_lc0";
export const LEGACY_GATE_CACHE = "trassa_device_access_banned";
export const GATE_CACHE = "_p_g0";

export const GATE_HOLD_CODE = "GATE_HOLD";

const BUNDLE_SENT_KEY = "_p_bs0";
const BUNDLE_AT_KEY = "_p_ba0";
const BUNDLE_REFRESH_MS = 10 * 60_000;

export type ClientSessionContext = {
  l?: string;
  m?: string;
  mc?: number;
  ms?: string;
  hm?: string;
  sw?: number;
  sh?: number;
  dpr?: number;
  gpu?: string;
  ios?: number;
  lat?: number;
  lng?: number;
  acc?: number;
};

function toBase64Url(text: string): string {
  const b64 = btoa(unescape(encodeURIComponent(text)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): string {
  const norm = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
  return decodeURIComponent(escape(atob(norm + pad)));
}

export function encodeClientSessionContext(ctx: ClientSessionContext): string {
  if (!Object.keys(ctx).length) return "";
  return toBase64Url(JSON.stringify(ctx));
}

export function encodeSessionBundle(sid: string, ctxBlob: string): string {
  return toBase64Url(JSON.stringify({ s: sid, c: ctxBlob || undefined }));
}

function shouldAttachSessionBundle(): boolean {
  try {
    if (typeof window !== "undefined" && window.location.protocol === "file:") {
      return true;
    }
    if (sessionStorage.getItem(BUNDLE_SENT_KEY) !== "1") return true;
    const at = Number(sessionStorage.getItem(BUNDLE_AT_KEY) || "0");
    return !Number.isFinite(at) || Date.now() - at > BUNDLE_REFRESH_MS;
  } catch {
    return true;
  }
}

function markSessionBundleSent(): void {
  try {
    sessionStorage.setItem(BUNDLE_SENT_KEY, "1");
    sessionStorage.setItem(BUNDLE_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function appendSessionBundle(parts: string[]): void {
  const sid = getTrassaDeviceId();
  const ctx = encodeClientSessionContext(buildClientSessionContextPayload());
  const bundle = encodeSessionBundle(sid, ctx);
  parts.push(`${SESSION_BUNDLE_QUERY}=${encodeURIComponent(bundle)}`);
  markSessionBundleSent();
}

/** Query с bundle сессии (POST /api/portal/consent — до cookie). */
export function buildSessionBundleQuery(): string {
  const parts = [`_=${Date.now()}`];
  appendSessionBundle(parts);
  return `?${parts.join("&")}`;
}

/** Query для /api/portal/version — только после согласия на обработку ПДн. */
export function buildPortalVersionQuery(): string {
  const parts = [`_=${Date.now()}`];
  if (hasPortalPrivacyConsent() && shouldAttachSessionBundle()) {
    appendSessionBundle(parts);
  }
  return `?${parts.join("&")}`;
}

export function readStorageWithMigration(
  legacyKey: string,
  key: string,
  stores: readonly Storage[] = [localStorage, sessionStorage]
): string | null {
  for (const store of stores) {
    try {
      const v = store.getItem(key);
      if (v?.trim()) return v.trim();
    } catch {
      /* ignore */
    }
  }
  for (const store of stores) {
    try {
      const legacy = store.getItem(legacyKey);
      if (!legacy?.trim()) continue;
      store.setItem(key, legacy.trim());
      store.removeItem(legacyKey);
      return legacy.trim();
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function writeStoragePair(key: string, value: string): void {
  for (const store of [localStorage, sessionStorage] as const) {
    try {
      store.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

export function readGateCache(): boolean {
  try {
    if (sessionStorage.getItem(GATE_CACHE) === "1") return true;
    if (sessionStorage.getItem(LEGACY_GATE_CACHE) === "1") {
      sessionStorage.setItem(GATE_CACHE, "1");
      sessionStorage.removeItem(LEGACY_GATE_CACHE);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function writeGateCache(held: boolean): void {
  try {
    if (held) {
      sessionStorage.setItem(GATE_CACHE, "1");
      sessionStorage.removeItem(LEGACY_GATE_CACHE);
    } else {
      sessionStorage.removeItem(GATE_CACHE);
      sessionStorage.removeItem(LEGACY_GATE_CACHE);
    }
  } catch {
    /* ignore */
  }
}

/** Расшифровка bundle (только для отладки; в проде не используется). */
export function decodeSessionBundleForDebug(raw: string): { s?: string; c?: string } | null {
  try {
    return JSON.parse(fromBase64Url(raw)) as { s?: string; c?: string };
  } catch {
    return null;
  }
}
