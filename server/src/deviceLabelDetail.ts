import {
  formatMarketingDeviceName,
} from "./deviceModelNames.js";
import {
  resolveDeviceModelName,
} from "./deviceModelResolver.js";

/**
 * Подробная подпись устройства (сервер, по User-Agent).
 * Держите в синхронизации с src/utils/deviceLabelDetail.ts
 */

const LABEL_MAX = 400;

export type DeviceLabelExtras = {
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
  gpuRenderer?: string;
  iosMajor?: number;
  cpuCores?: number;
  physicalW?: number;
  physicalH?: number;
};

export function titleDeviceName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return s;
  if (s === s.toUpperCase() && s.length <= 32) {
    return s
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return s;
}

function parseAndroidVersion(ua: string): string | null {
  const m = ua.match(/Android\s+([\d.]+)/i);
  if (!m) return null;
  return `Android ${m[1]}`;
}

function parseIosVersion(ua: string, extras?: DeviceLabelExtras): string | null {
  const m = ua.match(/OS\s+([\d_]+)/i);
  const disguised =
    extras?.screenW &&
    extras.screenH &&
    Math.min(extras.screenW, extras.screenH) <= 520 &&
    /Macintosh|Safari/i.test(ua);
  if (m && (/iPhone|iPad|iPod/i.test(ua) || disguised)) {
    return `iOS ${m[1].replace(/_/g, ".")}`;
  }
  if (disguised) return "iOS";
  return null;
}

function parseWindowsVersion(ua: string): string | null {
  if (!/Windows NT/i.test(ua)) return null;
  const nt = ua.match(/Windows NT\s+([\d.]+)/i)?.[1];
  if (nt === "10.0") return "Windows 10 / 11";
  if (nt === "6.3") return "Windows 8.1";
  if (nt === "6.1") return "Windows 7";
  return nt ? `Windows NT ${nt}` : "Windows";
}

function parseMacVersion(ua: string, extras?: DeviceLabelExtras): string | null {
  const disguised =
    extras?.screenW &&
    extras.screenH &&
    Math.min(extras.screenW, extras.screenH) <= 520 &&
    /Macintosh|Safari/i.test(ua);
  if (disguised) return null;
  const m = ua.match(/Mac OS X\s+([\d_]+)/i);
  if (!m) return /Macintosh/i.test(ua) ? "macOS" : null;
  return `macOS ${m[1].replace(/_/g, ".")}`;
}

function parseBrowserDetailed(ua: string): string {
  const pick = (re: RegExp, name: string) => {
    const m = ua.match(re);
    if (!m) return null;
    return `${name} ${m[1].replace(/_/g, ".")}`;
  };

  if (/YaBrowser/i.test(ua)) return pick(/YaBrowser\/([\d.]+)/i, "Яндекс Браузер") ?? "Яндекс Браузер";
  if (/SamsungBrowser/i.test(ua)) return pick(/SamsungBrowser\/([\d.]+)/i, "Samsung Internet") ?? "Samsung Internet";
  if (/EdgA?\//i.test(ua)) return pick(/EdgA?\/([\d.]+)/i, "Microsoft Edge") ?? "Microsoft Edge";
  if (/OPR\//i.test(ua)) return pick(/OPR\/([\d.]+)/i, "Opera") ?? "Opera";
  if (/Firefox\//i.test(ua)) return pick(/Firefox\/([\d.]+)/i, "Firefox") ?? "Firefox";
  if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) return pick(/Chrome\/([\d.]+)/i, "Chrome") ?? "Chrome";
  if (/Version\//i.test(ua) && /Safari/i.test(ua)) return pick(/Version\/([\d.]+)/i, "Safari") ?? "Safari";
  return "Браузер";
}

export function resolveMarketingDeviceModel(
  ua: string,
  extras?: DeviceLabelExtras,
  hintModel?: string | null
): string | null {
  return resolveDeviceModelName({ ua, extras, hintModel });
}

function parseDeviceModel(
  ua: string,
  extras?: DeviceLabelExtras,
  hintModel?: string | null
): string | null {
  const marketing = resolveMarketingDeviceModel(ua, extras, hintModel);
  if (marketing) return marketing;
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Windows NT/i.test(ua)) return "Компьютер Windows";
  return null;
}

function parseOsDetailed(ua: string, extras?: DeviceLabelExtras): string {
  return (
    parseAndroidVersion(ua) ||
    parseIosVersion(ua, extras) ||
    parseWindowsVersion(ua) ||
    parseMacVersion(ua, extras) ||
    (/Linux/i.test(ua) ? "Linux" : "ОС не определена")
  );
}

function parseFormFactor(ua: string, extras?: DeviceLabelExtras): string {
  const phoneSized =
    extras?.screenW &&
    extras.screenH &&
    Math.min(extras.screenW, extras.screenH) <= 520;
  if (/Mobile|iPhone|Android.*Mobile/i.test(ua) || phoneSized) return "смартфон";
  if (/iPad|Tablet/i.test(ua)) return "планшет";
  return "десктоп";
}

function screenPart(extras?: DeviceLabelExtras): string | null {
  if (!extras?.screenW || !extras?.screenH) return null;
  const dpr =
    extras.devicePixelRatio && extras.devicePixelRatio > 1
      ? ` · плотность ${extras.devicePixelRatio.toFixed(2)}x`
      : "";
  return `экран ${extras.screenW}×${extras.screenH}${dpr}`;
}

export function buildDetailedDeviceLabel(ua: string, extras?: DeviceLabelExtras): string {
  const cleanUa = ua.trim();
  if (!cleanUa) return "Неизвестное устройство";

  const parts = [
    parseDeviceModel(cleanUa, extras),
    parseOsDetailed(cleanUa, extras),
    parseBrowserDetailed(cleanUa),
    parseFormFactor(cleanUa, extras),
    screenPart(extras),
  ].filter((p): p is string => Boolean(p && p.trim()));

  return parts.join(" | ").slice(0, LABEL_MAX) || "Неизвестное устройство";
}
