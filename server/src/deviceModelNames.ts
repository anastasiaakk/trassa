/**
 * Маркетинговые названия устройств. Синхронизировать с src/utils/deviceModelNames.ts
 */

import { DEVICE_CODENAMES } from "./deviceCodenames.js";

const BRANDS_UPPER = [
  "POCO",
  "REDMI",
  "XIAOMI",
  "SAMSUNG",
  "HUAWEI",
  "HONOR",
  "REALME",
  "ONEPLUS",
  "VIVO",
  "OPPO",
  "MOTOROLA",
  "NOKIA",
  "SONY",
  "GOOGLE",
  "NOTHING",
  "TECNO",
  "INFINIX",
  "IPHONE",
  "IPAD",
];

function normalizeCodenameKey(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/-/g, "_").toUpperCase();
}

export function lookupAndroidCodename(raw: string): string | null {
  const key = normalizeCodenameKey(raw);
  if (DEVICE_CODENAMES[key]) return DEVICE_CODENAMES[key];
  const noUnderscore = key.replace(/_/g, "");
  for (const [k, name] of Object.entries(DEVICE_CODENAMES)) {
    if (k.replace(/_/g, "") === noUnderscore) return name;
  }
  return null;
}

export function lookupSamsungModel(sm: string): string | null {
  const key = sm.trim().toUpperCase().replace(/-/g, "_");
  return DEVICE_CODENAMES[key] ?? null;
}

export function formatMarketingDeviceName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return s;

  if (/^iPhone\s/i.test(s) || /^iPad\s/i.test(s)) {
    return s
      .replace(/^iphone/i, "iPhone")
      .replace(/^ipad/i, "iPad")
      .replace(/\bPro\b/gi, "Pro")
      .replace(/\bMax\b/gi, "Max")
      .replace(/\bPlus\b/gi, "Plus")
      .replace(/\bmini\b/gi, "mini")
      .replace(/\bSe\b/gi, "SE");
  }

  const upper = s.toUpperCase();
  for (const brand of BRANDS_UPPER) {
    if (upper.startsWith(`${brand} `) || upper === brand) {
      const rest = s.slice(brand.length).trim();
      const restFmt =
        rest.length > 0
          ? rest
              .split(" ")
              .map((w) => {
                if (/^\d+[a-z]?$/i.test(w)) return w.toUpperCase();
                if (/^pro|max|plus|ultra|nfc|lite|se$/i.test(w)) {
                  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
                }
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
              })
              .join(" ")
          : "";
      return restFmt ? `${brand} ${restFmt}` : brand;
    }
  }

  if (s === s.toUpperCase() && s.length <= 40) {
    return s
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return s;
}

const GENERIC_MODEL = /^(android|linux|mobile|unknown|khtml|generic|smartphone|phone)$/i;
const CODENAME_LIKE = /^[A-Z0-9][A-Z0-9._-]{4,14}$/i;

function isGenericModelName(s: string): boolean {
  return GENERIC_MODEL.test(s.trim()) || /^wv$/i.test(s.trim());
}

function looksLikeMarketingName(s: string): boolean {
  const t = s.trim();
  if (t.length < 3 || isGenericModelName(t)) return false;
  if (/^iPhone\s+\d/i.test(t) || /^iPad\b/i.test(t)) return true;
  if (BRANDS_UPPER.some((b) => t.toUpperCase().startsWith(`${b} `))) return true;
  if (/\s/.test(t) && /[a-zA-Z]/.test(t) && !CODENAME_LIKE.test(t.replace(/\s/g, ""))) {
    return true;
  }
  return false;
}

export function resolveFromModelHint(hint: string | null | undefined): string | null {
  if (!hint) return null;
  const hm = hint.trim();
  if (!hm || isGenericModelName(hm) || /^iPhone$/i.test(hm) || /^iPad$/i.test(hm)) return null;

  if (/poco\s*x\s*3\s*pro/i.test(hm)) return "POCO X3 Pro";
  if (/poco\s*f\s*3\b/i.test(hm) && !/x\s*3/i.test(hm)) return "POCO F3";

  const codename = lookupAndroidCodename(hm);
  if (codename) return codename;

  if (/^iPhone\d+,\d+$/i.test(hm)) return null;

  if (looksLikeMarketingName(hm)) return formatMarketingDeviceName(hm);

  if (CODENAME_LIKE.test(hm)) {
    const mapped = lookupAndroidCodename(hm);
    if (mapped) return mapped;
  }

  return formatMarketingDeviceName(hm);
}

export function parseAndroidModelFromUa(ua: string): string | null {
  const segments = ua.match(/Android\s+[\d.]+;\s*([^)]+)\)/i)?.[1];
  if (segments) {
    const parts = segments.split(";").map((p) => p.trim());
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (!part || /^ru-|^en-|^uk-/i.test(part)) continue;
      const beforeBuild = part.match(/^(.+?)\s+Build\//i)?.[1]?.trim();
      const candidate = (beforeBuild ?? part).trim();
      if (candidate.length < 2 || candidate.length > 96) continue;
      if (isGenericModelName(candidate)) continue;
      const mapped = lookupAndroidCodename(candidate);
      if (mapped) return mapped;
      if (looksLikeMarketingName(candidate)) return formatMarketingDeviceName(candidate);
    }
  }

  const build = ua.match(/;\s*([^;()]+?)\s+Build\//i);
  if (build) {
    const candidate = build[1].trim();
    if (!isGenericModelName(candidate) && candidate.length >= 2 && candidate.length <= 96) {
      const mapped = lookupAndroidCodename(candidate);
      if (mapped) return mapped;
      if (looksLikeMarketingName(candidate)) return formatMarketingDeviceName(candidate);
    }
  }

  const samsung = ua.match(/\b(SM-[A-Z0-9]+)/i);
  if (samsung) {
    return lookupSamsungModel(samsung[1]) ?? `Samsung ${samsung[1]}`;
  }

  return null;
}
