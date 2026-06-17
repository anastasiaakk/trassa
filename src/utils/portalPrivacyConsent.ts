import { PORTAL_PRIVACY_POLICY_VERSION } from "../legal/portalLegalConfig";

import { getApiBase } from "../api/authApi";

import { fetchWithTimeout } from "../api/fetchWithTimeout";

import { whenIntroSplashDone } from "./introSplashRuntime";

import { buildSessionBundleQuery } from "./portalClientSession";

import { initTrassaDeviceId } from "./deviceId";



const CONSENT_KEY = "_p_pc_v1";

const CONSENT_LEGACY = "trassa_portal_privacy_consent";

const CONSENT_SERVER_SYNC_KEY = "_p_pc_srv";



export type StoredPrivacyConsent = {

  version: string;

  acceptedAt: string;

};



export const PORTAL_PRIVACY_CONSENT_EVENT = "portal-privacy-consent";



export function readPortalPrivacyConsent(): StoredPrivacyConsent | null {

  try {

    const raw =

      localStorage.getItem(CONSENT_KEY) ??

      sessionStorage.getItem(CONSENT_KEY) ??

      localStorage.getItem(CONSENT_LEGACY) ??

      sessionStorage.getItem(CONSENT_LEGACY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredPrivacyConsent;

    if (!parsed?.version || !parsed?.acceptedAt) return null;

    return parsed;

  } catch {

    return null;

  }

}



export function hasPortalPrivacyConsent(): boolean {

  const c = readPortalPrivacyConsent();

  return c?.version === PORTAL_PRIVACY_POLICY_VERSION;

}



function clearConsentServerSyncFlag(): void {

  try {

    sessionStorage.removeItem(CONSENT_SERVER_SYNC_KEY);

  } catch {

    /* ignore */

  }

}



export function isPortalConsentSyncedToServer(): boolean {

  try {

    return sessionStorage.getItem(CONSENT_SERVER_SYNC_KEY) === "1";

  } catch {

    return false;

  }

}



function markPortalConsentSyncedToServer(): void {

  try {

    sessionStorage.setItem(CONSENT_SERVER_SYNC_KEY, "1");

  } catch {

    /* ignore */

  }

}



export function savePortalPrivacyConsentLocally(): StoredPrivacyConsent {

  const record: StoredPrivacyConsent = {

    version: PORTAL_PRIVACY_POLICY_VERSION,

    acceptedAt: new Date().toISOString(),

  };

  const json = JSON.stringify(record);

  for (const store of [localStorage, sessionStorage] as const) {

    try {

      store.setItem(CONSENT_KEY, json);

      store.removeItem(CONSENT_LEGACY);

    } catch {

      /* ignore */

    }

  }

  clearConsentServerSyncFlag();

  return record;

}



/** Сохраняет согласие на сервере (привязка к сессии устройства). */

export async function submitPortalPrivacyConsent(): Promise<boolean> {

  const base = getApiBase();

  if (!base && typeof window !== "undefined" && window.location.protocol !== "file:") {

    return false;

  }

  try {

    const res = await fetchWithTimeout(

      `${base}/api/portal/consent${buildSessionBundleQuery()}`,

      {

        method: "POST",

        credentials: "include",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ policyVersion: PORTAL_PRIVACY_POLICY_VERSION }),

      },

      12_000

    );

    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };

    if (!res.ok || !body.ok) return false;

    markPortalConsentSyncedToServer();

    return true;

  } catch {

    return false;

  }

}



let consentSubmitInFlight: Promise<void> | null = null;



const CONSENT_RETRY_DELAYS_MS = [0, 1_500, 4_000, 10_000, 30_000, 60_000];



async function runConsentSubmitWithRetry(): Promise<void> {

  if (isPortalConsentSyncedToServer()) return;

  for (let i = 0; i < CONSENT_RETRY_DELAYS_MS.length; i++) {

    if (isPortalConsentSyncedToServer()) return;

    const delay = CONSENT_RETRY_DELAYS_MS[i] ?? 60_000;

    if (delay > 0) {

      await new Promise<void>((resolve) => window.setTimeout(resolve, delay));

    }

    if (isPortalConsentSyncedToServer()) return;

    const ok = await submitPortalPrivacyConsent();

    if (ok) return;

  }

}



function queueConsentSubmit(): void {

  if (consentSubmitInFlight) return;

  consentSubmitInFlight = runConsentSubmitWithRetry().finally(() => {

    consentSubmitInFlight = null;

  });

}



/** Повторная отправка согласия, если локально есть, а сервер ещё не подтвердил. */

export function ensurePortalConsentServerSync(): void {

  if (!hasPortalPrivacyConsent() || isPortalConsentSyncedToServer()) return;

  queueConsentSubmit();

}



/**

 * Фиксирует визит в портал: локальное согласие + ID устройства + запись на сервере.

 * Синхронная часть сразу включает учёт в опросе /api/portal/version.

 */

export function ensurePortalEntrySession(): void {

  if (hasPortalPrivacyConsent()) {

    ensurePortalConsentServerSync();

    return;

  }

  initTrassaDeviceId();

  savePortalPrivacyConsentLocally();

  window.dispatchEvent(new CustomEvent(PORTAL_PRIVACY_CONSENT_EVENT));

  queueConsentSubmit();

}



export async function acceptPortalPrivacyConsent(): Promise<void> {

  ensurePortalEntrySession();

  if (consentSubmitInFlight) await consentSubmitInFlight;

}



/** Неявное согласие: пользователь продолжил пользоваться порталом. */

export async function registerImplicitPortalPrivacyConsent(): Promise<void> {

  ensurePortalEntrySession();

  if (consentSubmitInFlight) await consentSubmitInFlight;

}



/**

 * Учёт входа с любого маршрута: сразу при загрузке и при первом взаимодействии.

 * Интро больше не блокирует регистрацию — важно при массовых заходах (презентации).

 */

export function wirePortalEntryConsent(): () => void {

  if (typeof window === "undefined") return () => {};



  let disposed = false;



  const tryRegister = () => {

    if (disposed) return;

    ensurePortalEntrySession();

  };



  const onInteraction = () => {

    tryRegister();

    document.removeEventListener("pointerdown", onInteraction, true);

    document.removeEventListener("keydown", onInteraction, true);

  };



  const start = () => {

    if (disposed) return;

    tryRegister();

    if (!hasPortalPrivacyConsent()) {

      document.addEventListener("pointerdown", onInteraction, { capture: true, passive: true });

      document.addEventListener("keydown", onInteraction, { capture: true });

    }

  };



  start();

  whenIntroSplashDone(tryRegister);



  return () => {

    disposed = true;

    document.removeEventListener("pointerdown", onInteraction, true);

    document.removeEventListener("keydown", onInteraction, true);

  };

}


