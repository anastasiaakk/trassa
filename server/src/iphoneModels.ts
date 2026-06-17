/** Apple internal id → маркетинговое название. Синхронизировать с src/utils/iphoneModels.ts */

export const IPHONE_BY_HARDWARE_ID: Record<string, string> = {
  "iPhone8,1": "iPhone 6s",
  "iPhone8,2": "iPhone 6s Plus",
  "iPhone8,4": "iPhone SE (1-го пок.)",
  "iPhone9,1": "iPhone 7",
  "iPhone9,2": "iPhone 7 Plus",
  "iPhone10,1": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,3": "iPhone X",
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

type ScreenProfile = {
  w: number;
  h: number;
  name: string;
  minDpr?: number;
  maxDpr?: number;
};

const IPHONE_SCREEN_PROFILES: ScreenProfile[] = [
  { w: 320, h: 568, name: "iPhone SE (1-го пок.)" },
  { w: 375, h: 667, name: "iPhone 8" },
  { w: 375, h: 812, name: "iPhone 11 Pro" },
  /* iPhone 15 / 15 Pro / 14 Pro — один viewport 393×852; Pro только по HW id */
  { w: 393, h: 852, name: "iPhone 15", minDpr: 2.75 },
  { w: 393, h: 852, name: "iPhone 14 Pro", maxDpr: 2.74 },
  { w: 390, h: 844, name: "iPhone 14", minDpr: 2.75 },
  { w: 390, h: 844, name: "iPhone 13", maxDpr: 2.74 },
  { w: 402, h: 874, name: "iPhone 16 Pro" },
  { w: 414, h: 736, name: "iPhone 8 Plus" },
  { w: 414, h: 896, name: "iPhone 11" },
  { w: 428, h: 926, name: "iPhone 13 Pro Max" },
  /* 15 Plus / 15 Pro Max — 430×932; Max только по HW id */
  { w: 430, h: 932, name: "iPhone 15 Plus", minDpr: 2.75 },
  { w: 430, h: 932, name: "iPhone 14 Pro Max", maxDpr: 2.74 },
  { w: 440, h: 956, name: "iPhone 16 Pro Max" },
];

function idFromUserAgent(ua: string): string | null {
  const m = ua.match(/\b(iPhone|iPad)(\d+,\d+)\b/i);
  if (!m) return null;
  return `${m[1]}${m[2]}`;
}

function isLikelyDisguisedIosPhone(
  ua: string,
  screenW?: number,
  screenH?: number
): boolean {
  if (/Android/i.test(ua)) return false;
  if (/iPhone/i.test(ua)) return true;
  if (screenW && screenH) {
    const min = Math.min(screenW, screenH);
    const max = Math.max(screenW, screenH);
    if (min <= 520 && max <= 980 && /Macintosh|Safari/i.test(ua)) return true;
  }
  return false;
}

function guessIphoneFromScreen(
  screenW?: number,
  screenH?: number,
  devicePixelRatio?: number
): string | null {
  if (!screenW || !screenH) return null;
  const w = Math.min(screenW, screenH);
  const h = Math.max(screenW, screenH);
  const dpr = devicePixelRatio ?? 0;
  let best: ScreenProfile | null = null;
  let bestDist = Infinity;
  for (const p of IPHONE_SCREEN_PROFILES) {
    if (p.minDpr != null && dpr > 0 && dpr < p.minDpr) continue;
    if (p.maxDpr != null && dpr > 0 && dpr > p.maxDpr) continue;
    const dist = Math.abs(p.w - w) + Math.abs(p.h - h) * 0.5;
    if (dist < bestDist && dist <= 48) {
      bestDist = dist;
      best = p;
    }
  }
  return best?.name ?? null;
}

export function resolveAppleDeviceModel(
  ua: string,
  screenW?: number,
  screenH?: number,
  devicePixelRatio?: number
): string | null {
  if (/Android/i.test(ua)) return null;
  const id = idFromUserAgent(ua);
  if (id && IPHONE_BY_HARDWARE_ID[id]) return IPHONE_BY_HARDWARE_ID[id];
  if (isLikelyDisguisedIosPhone(ua, screenW, screenH)) {
    return guessIphoneFromScreen(screenW, screenH, devicePixelRatio) ?? "iPhone";
  }
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  return null;
}

/** Safari скрывает HW id — «15 Pro» по экрану часто ошибка для обычного iPhone 15. */
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

/** Крупный заголовок в админке. */
export function primaryModelFromLabel(label: string): string {
  const first = label.split(/\s*[|·]\s*/)[0]?.trim() ?? label.trim();
  if (/Android/i.test(label) && /iPhone|iPad/i.test(first)) {
    const m = label.match(/\b(POCO|Redmi|Xiaomi|Samsung Galaxy|Galaxy|Pixel|OnePlus|Honor|realme)\b[^|]*/i);
    if (m) return m[0].trim();
  }
  if (first && !/^iPhone$/i.test(first)) return first;
  const screen = label.match(/экран\s+(\d+)×(\d+)/i);
  if (screen) {
    const guessed = guessIphoneFromScreen(Number(screen[1]), Number(screen[2]));
    if (guessed) return guessed;
  }
  return first || label;
}
