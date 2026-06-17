import { isDisguisedIosPhone, isDisguisedIosTablet } from "./iosDeviceDetect";

type ScreenExtras = {
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
};

/** Apple internal id → маркетинговое название (iPhone12,1 = iPhone 11). */
export const IPHONE_BY_HARDWARE_ID: Record<string, string> = {
  "iPhone8,1": "iPhone 6s",
  "iPhone8,2": "iPhone 6s Plus",
  "iPhone8,4": "iPhone SE (1-го пок.)",
  "iPhone9,1": "iPhone 7",
  "iPhone9,2": "iPhone 7 Plus",
  "iPhone9,3": "iPhone 7",
  "iPhone9,4": "iPhone 7 Plus",
  "iPhone10,1": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,3": "iPhone X",
  "iPhone10,4": "iPhone 8",
  "iPhone10,5": "iPhone 8 Plus",
  "iPhone10,6": "iPhone X",
  "iPhone11,2": "iPhone XS",
  "iPhone11,4": "iPhone XS Max",
  "iPhone11,6": "iPhone XS Max",
  "iPhone11,8": "iPhone XR",
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE (2-го пок.)",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,6": "iPhone SE (3-го пок.)",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
};

const IPAD_BY_HARDWARE_ID: Record<string, string> = {
  "iPad6,11": "iPad (5-го пок.)",
  "iPad7,5": "iPad (6-го пок.)",
  "iPad11,6": "iPad (8-го пок.)",
  "iPad12,1": "iPad (9-го пок.)",
  "iPad13,18": "iPad (10-го пок.)",
  "iPad13,1": "iPad Air (4-го пок.)",
  "iPad13,16": "iPad Air (5-го пок.)",
  "iPad14,1": "iPad mini (6-го пок.)",
  "iPad8,9": "iPad Pro 11\" (2-го пок.)",
  "iPad13,4": "iPad Pro 11\" (3-го пок.)",
};

type ScreenProfile = {
  w: number;
  h: number;
  name: string;
  minDpr?: number;
  maxDpr?: number;
};

/** Экран в CSS-пикселях (ориентация не важна). */
const IPHONE_SCREEN_PROFILES: ScreenProfile[] = [
  { w: 320, h: 568, name: "iPhone SE (1-го пок.) / 5" },
  { w: 375, h: 667, name: "iPhone 6 / 7 / 8" },
  { w: 375, h: 812, name: "iPhone X / XS / 11 Pro" },
  { w: 393, h: 852, name: "iPhone 15", minDpr: 2.75 },
  { w: 393, h: 852, name: "iPhone 14 Pro", maxDpr: 2.74 },
  { w: 390, h: 844, name: "iPhone 14", minDpr: 2.75 },
  { w: 390, h: 844, name: "iPhone 13", maxDpr: 2.74 },
  { w: 402, h: 874, name: "iPhone 16 Pro" },
  { w: 414, h: 736, name: "iPhone 6 Plus / 7 Plus / 8 Plus" },
  { w: 414, h: 896, name: "iPhone 11 / XR" },
  { w: 428, h: 926, name: "iPhone 12 Pro Max / 13 Pro Max" },
  { w: 430, h: 932, name: "iPhone 15 Plus", minDpr: 2.75 },
  { w: 430, h: 932, name: "iPhone 14 Pro Max", maxDpr: 2.74 },
  { w: 440, h: 956, name: "iPhone 16 Pro Max" },
];

function normalizeHardwareId(raw: string): string | null {
  const m = raw.trim().match(/^(iPhone|iPad)(\d+,\d+)$/i);
  if (!m) return null;
  return `${m[1]}${m[2]}`;
}

function idFromUserAgent(ua: string): string | null {
  const m = ua.match(/\b(iPhone|iPad)(\d+,\d+)\b/i);
  if (!m) return null;
  return `${m[1]}${m[2]}`;
}

function guessIphoneFromScreen(extras?: ScreenExtras): string | null {
  if (!extras?.screenW || !extras?.screenH) return null;
  const w = Math.min(extras.screenW, extras.screenH);
  const h = Math.max(extras.screenW, extras.screenH);
  let best: ScreenProfile | null = null;
  let bestDist = Infinity;
  const dpr = extras?.devicePixelRatio ?? 0;
  for (const p of IPHONE_SCREEN_PROFILES) {
    if (p.minDpr != null && dpr > 0 && dpr < p.minDpr) continue;
    if (p.maxDpr != null && dpr > 0 && dpr > p.maxDpr) continue;
    const dist = Math.abs(p.w - w) + Math.abs(p.h - h) * 0.5;
    if (dist < bestDist && dist <= 48) {
      bestDist = dist;
      best = p;
    }
  }
  if (!best) return null;
  if (best.name === "iPhone 11 / XR") return "iPhone 11";
  return best.name;
}

export function isIphone15ProHwId(ua: string): boolean {
  return /\biPhone16,1\b/i.test(ua) || /\biPhone16,2\b/i.test(ua);
}

export function downgradeFalseIphone15Pro(
  name: string,
  ua: string,
  screenW?: number,
  screenH?: number
): string | null {
  if (isIphone15ProHwId(ua)) return null;
  const n = name.trim();
  if (n !== "iPhone 15 Pro" && n !== "iPhone 15 Pro Max") return null;
  const w = screenW && screenH ? Math.min(screenW, screenH) : 0;
  const h = screenW && screenH ? Math.max(screenW, screenH) : 0;
  if (n === "iPhone 15 Pro Max" || (w >= 428 && h >= 926)) return "iPhone 15 Plus";
  return "iPhone 15";
}

/** Сервер: только по размеру экрана из заголовков. */
export function resolveIphoneFromScreenHeaders(
  screenW?: number,
  screenH?: number
): string | null {
  if (!screenW || !screenH) return null;
  return guessIphoneFromScreen({ screenW, screenH });
}

export function resolveAppleDeviceModel(
  ua: string,
  hintModel?: string | null,
  extras?: ScreenExtras
): string | null {
  if (/Android/i.test(ua)) return null;
  const isIphone =
    /iPhone/i.test(ua) ||
    /iPhone/i.test(hintModel ?? "") ||
    isDisguisedIosPhone(ua, extras);
  const isIpad =
    /iPad/i.test(ua) ||
    /iPad/i.test(hintModel ?? "") ||
    isDisguisedIosTablet(ua, extras);

  const tryId = (id: string | null): string | null => {
    if (!id) return null;
    const norm = normalizeHardwareId(id);
    if (!norm) return null;
    if (IPHONE_BY_HARDWARE_ID[norm]) return IPHONE_BY_HARDWARE_ID[norm];
    if (IPAD_BY_HARDWARE_ID[norm]) return IPAD_BY_HARDWARE_ID[norm];
    return null;
  };

  const resolved =
    tryId(idFromUserAgent(ua)) ??
    tryId(hintModel ? normalizeHardwareId(hintModel) : null);

  if (resolved) return resolved;

  if (isIphone) {
    const fromScreen = guessIphoneFromScreen(extras);
    if (fromScreen) return fromScreen;
  }

  if (hintModel) {
    const hm = hintModel.trim();
    if (hm && !/^unknown$/i.test(hm) && !/^iPhone$/i.test(hm) && !/^iPad$/i.test(hm)) {
      if (/^iPhone\s*\d/i.test(hm) || /^iPad/i.test(hm)) {
        return hm.replace(/^iphone/i, "iPhone").replace(/\bpro\b/gi, "Pro").replace(/\bmax\b/gi, "Max");
      }
      if (/^iPhone\d+,\d+$/i.test(hm)) return tryId(hm);
    }
  }

  if (isIphone) return guessIphoneFromScreen(extras) ?? "iPhone";
  if (isIpad) return "iPad";
  return null;
}

/** Первая часть подписи — крупно в админке. */
export function primaryModelFromLabel(label: string): string {
  const first = label.split(/\s*[|·]\s*/)[0]?.trim() ?? label.trim();
  if (/Android/i.test(label) && /iPhone|iPad/i.test(first)) {
    const androidPart = label.match(/\b(POCO|Redmi|Xiaomi|Samsung Galaxy|Galaxy|Pixel|OnePlus|Honor|realme)\b[^|]*/i);
    if (androidPart) return androidPart[0].trim();
  }
  if (first && !/^iPhone$/i.test(first) && !/^iPad$/i.test(first)) return first;
  if (/Android/i.test(label)) return first || label;
  const screen = label.match(/экран\s+(\d+)×(\d+)/i);
  if (screen) {
    const guessed = guessIphoneFromScreen({
      screenW: Number(screen[1]),
      screenH: Number(screen[2]),
    });
    if (guessed) return guessed;
  }
  return first || label;
}
