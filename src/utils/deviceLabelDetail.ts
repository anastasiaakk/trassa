import { isAnyIosDevice, isDisguisedIosPhone, isDisguisedIosTablet } from "./iosDeviceDetect";
import { formatMarketingDeviceName } from "./deviceModelNames";
import {
  resolveDeviceModelBest,
  resolveDeviceModelName,
  type ResolvedDeviceModel,
} from "./deviceModelResolver";

/**
 * Подробная подпись устройства для админки «Выход с устройств».
 */

export type DeviceLabelExtras = {
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
  /** WebGL UNMASKED_RENDERER — «Apple A16 GPU» и т.п. */
  gpuRenderer?: string;
  iosMajor?: number;
  cpuCores?: number;
  physicalW?: number;
  physicalH?: number;
};

const LABEL_MAX = 400;

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
  if (m && (/iPhone|iPad|iPod/i.test(ua) || isAnyIosDevice(ua, extras))) {
    return `iOS ${m[1].replace(/_/g, ".")}`;
  }
  if (isAnyIosDevice(ua, extras)) return "iOS";
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
  if (isAnyIosDevice(ua, extras)) return null;
  const m = ua.match(/Mac OS X\s+([\d_]+)/i);
  if (!m) return /Macintosh/i.test(ua) ? "macOS" : null;
  return `macOS ${m[1].replace(/_/g, ".")}`;
}

function parseBrowserDetailed(ua: string): string {
  const pick = (re: RegExp, name: string) => {
    const m = ua.match(re);
    if (!m) return null;
    const ver = m[1].replace(/_/g, ".");
    return `${name} ${ver}`;
  };

  if (/YaBrowser/i.test(ua)) return pick(/YaBrowser\/([\d.]+)/i, "Яндекс Браузер") ?? "Яндекс Браузер";
  if (/SamsungBrowser/i.test(ua)) return pick(/SamsungBrowser\/([\d.]+)/i, "Samsung Internet") ?? "Samsung Internet";
  if (/EdgA?\//i.test(ua)) return pick(/EdgA?\/([\d.]+)/i, "Microsoft Edge") ?? "Microsoft Edge";
  if (/OPR\//i.test(ua)) return pick(/OPR\/([\d.]+)/i, "Opera") ?? "Opera";
  if (/Firefox\//i.test(ua)) return pick(/Firefox\/([\d.]+)/i, "Firefox") ?? "Firefox";
  if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) {
    return pick(/Chrome\/([\d.]+)/i, "Chrome") ?? "Chrome";
  }
  if (/Version\//i.test(ua) && /Safari/i.test(ua)) {
    const safari = pick(/Version\/([\d.]+)/i, "Safari");
    if (safari) return safari;
  }
  return "Браузер";
}

/** Конкретная модель: «iPhone 15 Pro», «POCO X3 Pro». */
export function resolveMarketingDeviceModel(
  ua: string,
  extras?: DeviceLabelExtras,
  hintModel?: string | null
): string | null {
  return resolveDeviceModelName({ ua, extras, hintModel });
}

export { resolveDeviceModelBest, type ResolvedDeviceModel };

export function parseDeviceModelFromUa(
  ua: string,
  extras?: DeviceLabelExtras,
  hintModel?: string | null
): string | null {
  return resolveMarketingDeviceModel(ua, extras, hintModel);
}

function parseDeviceModel(
  ua: string,
  extras?: DeviceLabelExtras,
  hintModel?: string | null
): string | null {
  const marketing = resolveMarketingDeviceModel(ua, extras, hintModel);
  if (marketing) return marketing;
  if (!isAnyIosDevice(ua, extras)) {
    if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
    if (/Windows NT/i.test(ua)) return "Компьютер Windows";
  }
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
  if (isDisguisedIosPhone(ua, extras) || /Mobile|iPhone|Android.*Mobile/i.test(ua)) {
    return "смартфон";
  }
  if (isDisguisedIosTablet(ua, extras) || /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    return "планшет";
  }
  if (extras?.screenW && extras.screenH) {
    const min = Math.min(extras.screenW, extras.screenH);
    if (min < 768) return "мобильный экран";
  }
  return "десктоп";
}

function screenPart(extras?: DeviceLabelExtras): string | null {
  if (!extras?.screenW || !extras.screenH) return null;
  const dpr =
    extras.devicePixelRatio && extras.devicePixelRatio > 1
      ? ` · плотность ${extras.devicePixelRatio.toFixed(2)}x`
      : "";
  return `экран ${extras.screenW}×${extras.screenH}${dpr}`;
}

/** Сборка из User-Agent (+ экран с клиента). */
export function buildDetailedDeviceLabel(
  ua: string,
  extras?: DeviceLabelExtras
): string {
  const cleanUa = ua.trim();
  if (!cleanUa) return "Неизвестное устройство";

  const model = parseDeviceModel(cleanUa, extras);
  const os = parseOsDetailed(cleanUa, extras);
  const browser = parseBrowserDetailed(cleanUa);
  const form = parseFormFactor(cleanUa, extras);
  const screen = screenPart(extras);

  const parts = [model, os, browser, form, screen].filter(
    (p): p is string => Boolean(p && p.trim())
  );

  const label = parts.join(" | ");
  return label.slice(0, LABEL_MAX) || "Неизвестное устройство";
}

type UaHighEntropy = {
  model?: string;
  platform?: string;
  platformVersion?: string;
  mobile?: boolean;
  brands?: Array<{ brand: string; version: string }>;
  fullVersionList?: Array<{ brand: string; version: string }>;
};

/** Client Hints — точная модель и версия браузера (Chrome, Яндекс). */
export async function buildDetailedDeviceLabelFromHints(
  ua: string,
  extras?: DeviceLabelExtras
): Promise<string | null> {
  if (typeof navigator === "undefined") return null;
  const uad = (
    navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues: (h: string[]) => Promise<UaHighEntropy>;
        brands?: Array<{ brand: string; version: string }>;
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
      "fullVersionList",
      "brands",
    ]);

    const modelRaw = v.model?.trim() ?? null;
    const model =
      resolveMarketingDeviceModel(ua, extras, modelRaw) ??
      (modelRaw && !/^unknown$/i.test(modelRaw)
        ? formatMarketingDeviceName(modelRaw)
        : null);

    const platform = v.platform?.trim() || "";
    const pVer = v.platformVersion?.trim();
    let os = parseOsDetailed(ua, extras);
    if (platform) {
      if (/ios/i.test(platform)) {
        os = pVer ? `iOS ${pVer.replace(/_/g, ".")}` : "iOS";
      } else {
        os = pVer ? `${platform} ${pVer}` : platform;
        if (/android/i.test(platform) && !/android/i.test(os)) {
          os = pVer ? `Android ${pVer}` : "Android";
        }
      }
    }

    let browser = parseBrowserDetailed(ua);
    const list = v.fullVersionList ?? v.brands ?? uad.brands;
    if (list?.length) {
      const main =
        list.find((b) => /yandex|chrome|edge|firefox|safari|opera/i.test(b.brand)) ??
        list[list.length - 1];
      if (main?.brand && main.version) {
        const name = /yandex/i.test(main.brand)
          ? "Яндекс Браузер"
          : /chrome/i.test(main.brand)
            ? "Chrome"
            : /edge/i.test(main.brand)
              ? "Edge"
              : titleDeviceName(main.brand);
        browser = `${name} ${main.version.replace(/_/g, ".")}`;
      }
    }

    const form = v.mobile === true ? "смартфон" : v.mobile === false ? "десктоп" : parseFormFactor(ua, extras);
    const screen = screenPart(extras);

    const parts = [model, os, browser, form, screen].filter(
      (p): p is string => Boolean(p && p.trim())
    );
    const label = parts.join(" | ");
    return label.slice(0, LABEL_MAX) || null;
  } catch {
    return null;
  }
}

import {
  collectWebGLRenderer,
  parseIosMajorVersion,
} from "./appleGpuFingerprint";

export function clientScreenExtras(): DeviceLabelExtras | undefined {
  if (typeof window === "undefined") return undefined;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const dpr = window.devicePixelRatio ?? 1;
  const screenW = window.screen?.width ?? undefined;
  const screenH = window.screen?.height ?? undefined;
  const gpuRenderer = collectWebGLRenderer() ?? undefined;
  const iosMajor = parseIosMajorVersion(ua);
  const cpuCores =
    typeof navigator !== "undefined" && navigator.hardwareConcurrency > 0
      ? navigator.hardwareConcurrency
      : undefined;
  return {
    screenW,
    screenH,
    devicePixelRatio: dpr > 0 ? dpr : undefined,
    physicalW: screenW ? Math.round(screenW * dpr) : undefined,
    physicalH: screenH ? Math.round(screenH * dpr) : undefined,
    gpuRenderer,
    iosMajor,
    cpuCores,
  };
}
