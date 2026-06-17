import {
  MODEL_CONFIDENCE,
  resolveDeviceModelBest,
  type ResolvedDeviceModel,
} from "./deviceModelResolver";
import { clientScreenExtras, type DeviceLabelExtras } from "./deviceLabelDetail";

const MODEL_CACHE_KEY = "pv2_cctx_v1";
const LEGACY_MODEL_CACHE_KEY = "trassa_device_model_v5";

type CachedModel = ResolvedDeviceModel & { hintModel?: string };

let memoryModel: CachedModel | null = null;
let resolvePromise: Promise<CachedModel | null> | null = null;

function persistModel(model: CachedModel): CachedModel {
  memoryModel = model;
  try {
    localStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(model));
    sessionStorage.setItem(MODEL_CACHE_KEY, JSON.stringify(model));
  } catch {
    /* ignore */
  }
  return model;
}

function readCachedModel(): CachedModel | null {
  if (memoryModel) return memoryModel;
  for (const key of [MODEL_CACHE_KEY, LEGACY_MODEL_CACHE_KEY]) {
    for (const store of [localStorage, sessionStorage] as const) {
      try {
        const raw = store.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as CachedModel;
        if (parsed?.name && parsed.confidence >= 50) {
          memoryModel = parsed;
          if (key === LEGACY_MODEL_CACHE_KEY) persistModel(parsed);
          return parsed;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

type UaHighEntropy = {
  model?: string;
  platform?: string;
  platformVersion?: string;
  mobile?: boolean;
};

/** Client Hints — самый точный источник на Android (Chrome, Яндекс). */
export async function resolveDeviceModelWithHints(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  extras: DeviceLabelExtras | undefined = clientScreenExtras()
): Promise<CachedModel | null> {
  if (typeof navigator === "undefined") return null;
  const uad = (
    navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues: (h: string[]) => Promise<UaHighEntropy>;
      };
    }
  ).userAgentData;
  if (!uad?.getHighEntropyValues) return null;

  try {
    const v = await uad.getHighEntropyValues([
      "model",
      "platform",
      "platformVersion",
      "mobile",
    ]);
    const hintModel = v.model?.trim() || null;
    const resolved = resolveDeviceModelBest({
      ua,
      extras,
      hintModel,
    });
    if (!resolved || resolved.confidence < MODEL_CONFIDENCE.GENERIC_APPLE) return null;
    return persistModel({ ...resolved, hintModel: hintModel ?? undefined });
  } catch {
    return null;
  }
}

export function ensureDeviceModelResolved(): Promise<CachedModel | null> {
  if (resolvePromise) return resolvePromise;
  resolvePromise = (async () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const extras = clientScreenExtras();
    const fromHints = await resolveDeviceModelWithHints(ua, extras);
    if (fromHints) return fromHints;
    const sync = resolveDeviceModelBest({ ua, extras });
    if (sync && sync.confidence >= MODEL_CONFIDENCE.GENERIC_APPLE) {
      return persistModel(sync);
    }
    return readCachedModel();
  })();
  return resolvePromise;
}

export function getBestCachedDeviceModel(): CachedModel | null {
  const cached = readCachedModel();
  if (cached) return cached;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const sync = resolveDeviceModelBest({ ua, extras: clientScreenExtras() });
  if (sync && sync.confidence >= MODEL_CONFIDENCE.GENERIC_APPLE) {
    return persistModel(sync);
  }
  return sync;
}

export function getBestDeviceModelName(): string | null {
  return getBestCachedDeviceModel()?.name ?? null;
}

export function getBestDeviceModelMeta(): ResolvedDeviceModel | null {
  return getBestCachedDeviceModel();
}
