import {
  buildDetailedDeviceLabel,
  buildDetailedDeviceLabelFromHints,
  clientScreenExtras,
} from "./deviceLabelDetail";
import {
  ensureDeviceModelResolved,
  getBestDeviceModelMeta,
  getBestDeviceModelName,
} from "./deviceModelResolveClient";
import {
  LEGACY_STORAGE_ID,
  LEGACY_STORAGE_ID_V2,
  LEGACY_STORAGE_LABEL,
  readStorageWithMigration,
  STORAGE_ID,
  STORAGE_LABEL,
  writeStoragePair,
  type ClientSessionContext,
} from "./portalClientSession";

export { parseDeviceModelFromUa, titleDeviceName } from "./deviceLabelDetail";

/** @deprecated используйте getTrassaDeviceId — оставлено для внутренних модулей */
export { getTrassaDeviceId as getPortalClientSessionId };

const LEGACY_LABEL_KEYS = [
  "trassa_device_label",
  "trassa_device_label_v2",
  "trassa_device_label_v3",
  "trassa_device_label_v4",
  "trassa_device_label_v5",
  "trassa_device_label_v6",
  "trassa_device_label_v7",
];

/** Память — если localStorage недоступен (часто на Android / в Яндексе). */
let cachedDeviceId: string | null = null;

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `d-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function persistDeviceId(id: string): void {
  cachedDeviceId = id;
  writeStoragePair(STORAGE_ID, id);
  try {
    localStorage.removeItem(LEGACY_STORAGE_ID);
    sessionStorage.removeItem(LEGACY_STORAGE_ID);
  } catch {
    /* ignore */
  }
}

const LABEL_RESOLVE_TIMEOUT_MS = 4_500;
let labelResolvePromise: Promise<string> | null = null;

function persistLabel(label: string): string {
  const trimmed = label.slice(0, 400);
  writeStoragePair(STORAGE_LABEL, trimmed);
  for (const key of LEGACY_LABEL_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  return trimmed;
}

function isStaleDeviceLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return true;
  if (/^iPhone\s*[·|]\s*Safari\s*[·|]\s*macOS\s*$/i.test(t)) return true;
  if (/^iPhone\s*[·|]\s*Safari/i.test(t) && !/экран\s+\d+/i.test(t)) return true;
  const first = t.split(/\s*[|·]\s*/)[0]?.trim() ?? "";
  if (/^iPhone$/i.test(first) || /^iPad$/i.test(first)) return true;
  return false;
}

function readStoredLabel(): string | null {
  const migrated = readStorageWithMigration(LEGACY_STORAGE_LABEL, STORAGE_LABEL);
  if (migrated && !isStaleDeviceLabel(migrated)) {
    return migrated.slice(0, 400);
  }
  for (const key of LEGACY_LABEL_KEYS) {
    for (const store of [localStorage, sessionStorage] as const) {
      try {
        const cached = store.getItem(key);
        if (cached && cached.trim().length >= 2 && !isStaleDeviceLabel(cached)) {
          return persistLabel(cached.trim());
        }
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

/** Уточняет подпись и модель (Client Hints + экран). */
export function ensureDeviceLabelResolved(): Promise<string> {
  if (labelResolvePromise) return labelResolvePromise;
  labelResolvePromise = Promise.race([
    (async () => {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const extras = clientScreenExtras();
      await ensureDeviceModelResolved();
      const fromHints = await buildDetailedDeviceLabelFromHints(ua, extras);
      const label = persistLabel(fromHints ?? buildDetailedDeviceLabel(ua, extras));
      return label;
    })(),
    new Promise<string>((resolve) => {
      window.setTimeout(() => resolve(getCachedDeviceLabel()), LABEL_RESOLVE_TIMEOUT_MS);
    }),
  ]);
  return labelResolvePromise;
}

export function getTrassaDeviceId(): string {
  if (cachedDeviceId && /^[a-zA-Z0-9_-]{8,128}$/.test(cachedDeviceId)) {
    return cachedDeviceId;
  }

  const migrated =
    readStorageWithMigration(LEGACY_STORAGE_ID, STORAGE_ID) ??
    readStorageWithMigration(LEGACY_STORAGE_ID_V2, STORAGE_ID);
  if (migrated && /^[a-zA-Z0-9_-]{8,128}$/.test(migrated)) {
    persistDeviceId(migrated);
    return migrated;
  }

  const id = randomId();
  persistDeviceId(id);
  return id;
}

export function buildQuickDeviceLabel(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): string {
  return buildDetailedDeviceLabel(ua, clientScreenExtras());
}

export function getCachedDeviceLabel(): string {
  const stored = readStoredLabel();
  if (stored) return stored;
  return getLiveDeviceLabel();
}

export function getLiveDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Неизвестное устройство";
  const ua = navigator.userAgent;
  const extras = clientScreenExtras();
  const model = getBestDeviceModelName();
  const base = buildDetailedDeviceLabel(ua, extras);
  if (!model) return base;
  const parts = base.split("|").map((p) => p.trim());
  if (parts[0] === model) return base;
  return [model, ...parts.slice(1)].filter(Boolean).join(" | ").slice(0, 400);
}

export function getMarketingDeviceModel(): string | null {
  return getBestDeviceModelName();
}

export function buildClientSessionContextPayload(): ClientSessionContext {
  const label = getLiveDeviceLabel();
  const extras = clientScreenExtras();
  const meta = getBestDeviceModelMeta();
  const ctx: ClientSessionContext = {
    l: encodeURIComponent(label),
  };
  if (meta?.name) {
    ctx.m = encodeURIComponent(meta.name);
    ctx.mc = meta.confidence;
    ctx.ms = meta.source.slice(0, 40);
  }
  if (meta && "hintModel" in meta && typeof meta.hintModel === "string" && meta.hintModel) {
    ctx.hm = encodeURIComponent(meta.hintModel.slice(0, 80));
  }
  if (extras?.screenW) ctx.sw = extras.screenW;
  if (extras?.screenH) ctx.sh = extras.screenH;
  if (extras?.devicePixelRatio && extras.devicePixelRatio > 0) ctx.dpr = extras.devicePixelRatio;
  if (extras?.gpuRenderer) ctx.gpu = encodeURIComponent(extras.gpuRenderer.slice(0, 120));
  if (extras?.iosMajor && extras.iosMajor > 0) ctx.ios = extras.iosMajor;
  return ctx;
}

/** @deprecated Сессия передаётся cookie + query k на /api/portal/version. */
export function trassaDeviceHeaders(): Record<string, string> {
  void ensureDeviceLabelResolved();
  return {};
}

export function initTrassaDeviceId(): void {
  getTrassaDeviceId();
  void ensureDeviceModelResolved();
  void ensureDeviceLabelResolved();
}
