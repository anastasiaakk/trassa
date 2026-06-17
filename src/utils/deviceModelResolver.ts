import { DEVICE_CODENAMES } from "./deviceCodenames";
import type { DeviceLabelExtras } from "./deviceLabelDetail";
import {
  formatMarketingDeviceName,
  parseAndroidModelFromUa,
  resolveFromModelHint,
} from "./deviceModelNames";
import { isAndroidUa } from "./iosDeviceDetect";
import { resolveAppleFromGpuFingerprint } from "./appleGpuFingerprint";
import { resolveAppleDeviceModel } from "./iphoneModels";

export type ResolvedDeviceModel = {
  name: string;
  confidence: number;
  source: string;
};

export const MODEL_CONFIDENCE = {
  APPLE_HW_ID: 98,
  APPLE_GPU: 95,
  HINT_MARKETING: 96,
  HINT_CODENAME: 93,
  UA_MARKETING: 90,
  SAMSUNG_MAPPED: 91,
  UA_CODENAME: 86,
  CLIENT_CACHED: 88,
  IPHONE_SCREEN: 74,
  IPHONE_SCREEN_WEAK: 62,
  GENERIC_APPLE: 18,
  GENERIC: 8,
} as const;

function normalizeCodenameKey(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/-/g, "_").toUpperCase();
}

export function lookupDeviceCodename(raw: string): string | null {
  const key = normalizeCodenameKey(raw);
  if (DEVICE_CODENAMES[key]) return DEVICE_CODENAMES[key];
  const compact = key.replace(/_/g, "");
  for (const [k, name] of Object.entries(DEVICE_CODENAMES)) {
    if (k.replace(/_/g, "") === compact) return name;
  }
  return null;
}

/** Насколько имя конкретное (iPhone 15 Pro > iPhone). */
export function modelSpecificityScore(name: string): number {
  const t = name.trim();
  if (!t) return 0;
  if (/^iPhone$/i.test(t) || /^iPad$/i.test(t)) return 1;
  let score = 2;
  if (/\d/.test(t)) score += 4;
  if (/\b(pro|max|plus|ultra|mini|se)\b/i.test(t)) score += 3;
  if (/\b(POCO|Redmi|Xiaomi|Galaxy|Pixel|OnePlus|Samsung|Honor|realme)\b/i.test(t)) {
    score += 4;
  }
  return score;
}

function isWeakGeneric(name: string): boolean {
  return /^iPhone$/i.test(name) || /^iPad$/i.test(name) || /^Android$/i.test(name);
}

function pushCandidate(
  list: ResolvedDeviceModel[],
  name: string | null | undefined,
  confidence: number,
  source: string
): void {
  if (!name?.trim()) return;
  const clean = formatMarketingDeviceName(name.trim());
  if (!clean || isWeakGeneric(clean)) return;
  list.push({ name: clean, confidence, source });
}

export type ModelResolveInput = {
  ua: string;
  extras?: DeviceLabelExtras;
  hintModel?: string | null;
  clientModel?: string | null;
  clientConfidence?: number;
  clientSource?: string | null;
};

export function collectModelCandidates(input: ModelResolveInput): ResolvedDeviceModel[] {
  const { ua, extras, hintModel, clientModel, clientConfidence, clientSource } = input;
  const out: ResolvedDeviceModel[] = [];

  if (clientModel?.trim() && (clientConfidence ?? 0) >= 50) {
    pushCandidate(out, clientModel, clientConfidence ?? MODEL_CONFIDENCE.CLIENT_CACHED, clientSource ?? "client");
  }

  if (hintModel?.trim()) {
    const mapped = resolveFromModelHint(hintModel);
    if (mapped) {
      const fromMap = lookupDeviceCodename(hintModel);
      pushCandidate(
        out,
        mapped,
        fromMap ? MODEL_CONFIDENCE.HINT_CODENAME : MODEL_CONFIDENCE.HINT_MARKETING,
        fromMap ? "client-hints-codename" : "client-hints"
      );
    } else {
      const codename = lookupDeviceCodename(hintModel);
      if (codename) {
        pushCandidate(out, codename, MODEL_CONFIDENCE.HINT_CODENAME, "client-hints-codename");
      }
    }
  }

  if (!isAndroidUa(ua)) {
    const gpuResolved = resolveAppleFromGpuFingerprint(extras);
    if (gpuResolved) {
      pushCandidate(
        out,
        gpuResolved.name,
        gpuResolved.confidence,
        gpuResolved.source
      );
    }
    const apple = resolveAppleDeviceModel(ua, hintModel, extras);
    if (apple) {
      const hw = ua.match(/\b(iPhone|iPad)(\d+,\d+)\b/i);
      pushCandidate(
        out,
        apple,
        hw ? MODEL_CONFIDENCE.APPLE_HW_ID : isWeakGeneric(apple) ? MODEL_CONFIDENCE.GENERIC_APPLE : MODEL_CONFIDENCE.IPHONE_SCREEN,
        hw ? "apple-hw-id" : "iphone-screen"
      );
    }
  }

  if (isAndroidUa(ua)) {
    const androidUa = parseAndroidModelFromUa(ua);
    if (androidUa) {
      const isMapped = Boolean(lookupDeviceCodename(androidUa) || /Galaxy|POCO|Redmi|Pixel/i.test(androidUa));
      pushCandidate(
        out,
        androidUa,
        /Samsung Galaxy/i.test(androidUa)
          ? MODEL_CONFIDENCE.SAMSUNG_MAPPED
          : isMapped
            ? MODEL_CONFIDENCE.UA_CODENAME
            : MODEL_CONFIDENCE.UA_MARKETING,
        "user-agent"
      );
    }
  }

  return out;
}

export function pickBestResolvedModel(
  candidates: ResolvedDeviceModel[]
): ResolvedDeviceModel | null {
  if (!candidates.length) return null;
  let best = candidates[0];
  for (const c of candidates.slice(1)) {
    if (c.confidence > best.confidence) {
      best = c;
      continue;
    }
    if (
      c.confidence === best.confidence &&
      modelSpecificityScore(c.name) > modelSpecificityScore(best.name)
    ) {
      best = c;
    }
  }
  return best;
}

export function resolveDeviceModelBest(input: ModelResolveInput): ResolvedDeviceModel | null {
  return pickBestResolvedModel(collectModelCandidates(input));
}

export function resolveDeviceModelName(input: ModelResolveInput): string | null {
  return resolveDeviceModelBest(input)?.name ?? null;
}

/** Сравнить две модели — вернуть лучшую (не понижать точность). */
export function pickBetterStoredModel(
  stored: { name: string; confidence: number } | null,
  incoming: ResolvedDeviceModel | null
): ResolvedDeviceModel | null {
  if (!stored?.name) return incoming;
  if (!incoming) return stored.name ? { name: stored.name, confidence: stored.confidence, source: "stored" } : null;
  if (incoming.confidence > stored.confidence) return incoming;
  if (
    incoming.confidence === stored.confidence &&
    modelSpecificityScore(incoming.name) > modelSpecificityScore(stored.name)
  ) {
    return incoming;
  }
  return { name: stored.name, confidence: stored.confidence, source: "stored" };
}
