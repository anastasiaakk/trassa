export type PortalBrowserId =
  | "safari-ios"
  | "chrome-ios"
  | "yandex-ios"
  | "firefox-ios"
  | "chrome-android"
  | "yandex-android"
  | "firefox-android"
  | "android-other"
  | "safari-desktop"
  | "chrome-desktop"
  | "yandex-desktop"
  | "firefox-desktop"
  | "other";

const BROWSER_LABELS: Record<PortalBrowserId, string> = {
  "safari-ios": "Safari (iPhone/iPad)",
  "chrome-ios": "Google Chrome (iOS)",
  "yandex-ios": "Яндекс Браузер (iOS)",
  "firefox-ios": "Firefox (iOS)",
  "chrome-android": "Google Chrome (Android)",
  "yandex-android": "Яндекс Браузер (Android)",
  "firefox-android": "Firefox (Android)",
  "android-other": "Android (другой)",
  "safari-desktop": "Safari (Mac)",
  "chrome-desktop": "Google Chrome",
  "yandex-desktop": "Яндекс Браузер",
  "firefox-desktop": "Firefox",
  other: "Другой браузер",
};

export function detectPortalBrowser(): PortalBrowserId {
  if (typeof window === "undefined") return "other";
  const w = window as Window & { __trassaPortalBrowser?: string };
  if (w.__trassaPortalBrowser && w.__trassaPortalBrowser in BROWSER_LABELS) {
    return w.__trassaPortalBrowser as PortalBrowserId;
  }

  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isYandex = /YaBrowser|YandexSearchBrowser|Yandex/i.test(ua);
  const isCriOS = /CriOS/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isChrome =
    (/Chrome|Chromium/i.test(ua) && !/Edg|OPR|YaBrowser|YandexSearchBrowser/i.test(ua)) ||
    isCriOS;
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|YaBrowser|Yandex|Edg|OPR/i.test(ua);

  if (isIOS) {
    if (isYandex) return "yandex-ios";
    if (isCriOS || isChrome) return "chrome-ios";
    if (isFirefox) return "firefox-ios";
    return "safari-ios";
  }
  if (isAndroid) {
    if (isYandex) return "yandex-android";
    if (isFirefox) return "firefox-android";
    if (/Chrome/i.test(ua)) return "chrome-android";
    return "android-other";
  }
  if (isYandex) return "yandex-desktop";
  if (isSafari) return "safari-desktop";
  if (isChrome) return "chrome-desktop";
  if (isFirefox) return "firefox-desktop";
  return "other";
}

export function getPortalBrowserLabel(id = detectPortalBrowser()): string {
  const base = BROWSER_LABELS[id] ?? BROWSER_LABELS.other;
  if (isMiuiDevice() && (id === "yandex-android" || id === "chrome-android" || id === "android-other")) {
    return `${base} · MIUI (POCO/Xiaomi)`;
  }
  return base;
}

export function isWebKitMobileBrowser(id = detectPortalBrowser()): boolean {
  return (
    id === "safari-ios" ||
    id === "chrome-ios" ||
    id === "yandex-ios" ||
    id === "firefox-ios"
  );
}

export function isBlinkMobileBrowser(id = detectPortalBrowser()): boolean {
  return (
    id === "chrome-android" ||
    id === "yandex-android" ||
    id === "firefox-android" ||
    id === "android-other"
  );
}

/** POCO / Redmi / Xiaomi — MIUI, скриншот часто даёт сдвиг экрана (превью сверху). */
export function isMiuiDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /MiuiBrowser|Miui|Xiaomi|Redmi|POCO|Mi\sBuild|HM\sNote/i.test(ua);
}

export function isYandexAndroidBrowser(id = detectPortalBrowser()): boolean {
  return id === "yandex-android";
}

export function isTargetPortalBrowser(id = detectPortalBrowser()): boolean {
  return (
    id === "safari-ios" ||
    id === "chrome-ios" ||
    id === "yandex-ios" ||
    id === "chrome-android" ||
    id === "yandex-android" ||
    id === "safari-desktop" ||
    id === "chrome-desktop" ||
    id === "yandex-desktop"
  );
}

export function applyPortalBrowserMarker(): void {
  const id = detectPortalBrowser();
  document.documentElement.setAttribute("data-portal-browser", id);
  if (isMiuiDevice()) {
    document.documentElement.setAttribute("data-portal-miui", "1");
  }
  if (id === "yandex-android") {
    document.documentElement.setAttribute("data-portal-yandex-android", "1");
  }
}
