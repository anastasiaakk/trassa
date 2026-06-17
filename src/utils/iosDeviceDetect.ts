type ScreenExtras = {
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
};

/** Android-браузеры (Яндекс, Chrome) иногда содержат «Safari» в UA — не путать с iPhone. */
export function isAndroidUa(ua: string): boolean {
  return /Android/i.test(ua);
}

/** Safari на iPhone с iOS 13+ часто шлёт User-Agent как «Macintosh … Safari». */
export function isDisguisedIosPhone(ua: string, extras?: ScreenExtras): boolean {
  if (isAndroidUa(ua)) return false;
  if (/iPhone/i.test(ua)) return true;
  if (typeof navigator !== "undefined") {
    const plat = navigator.platform ?? "";
    if (/^iPhone$/i.test(plat)) return true;
    if (/Macintosh|Mac OS X/i.test(ua) && navigator.maxTouchPoints > 1) {
      const w = extras?.screenW ?? (typeof window !== "undefined" ? window.screen?.width : undefined);
      const h = extras?.screenH ?? (typeof window !== "undefined" ? window.screen?.height : undefined);
      if (w && h && Math.min(w, h) <= 520) return true;
    }
  }
  if (extras?.screenW && extras.screenH) {
    const min = Math.min(extras.screenW, extras.screenH);
    const max = Math.max(extras.screenW, extras.screenH);
    if (min <= 520 && max <= 980 && /Macintosh|Safari/i.test(ua)) return true;
  }
  return false;
}

export function isDisguisedIosTablet(ua: string, extras?: ScreenExtras): boolean {
  if (isAndroidUa(ua)) return false;
  if (/iPad/i.test(ua)) return true;
  if (typeof navigator !== "undefined") {
    const plat = navigator.platform ?? "";
    if (/^iPad$/i.test(plat)) return true;
    if (/Macintosh|Mac OS X/i.test(ua) && navigator.maxTouchPoints > 1) {
      const w = extras?.screenW ?? window.screen?.width;
      const h = extras?.screenH ?? window.screen?.height;
      if (w && h && Math.min(w, h) >= 700) return true;
    }
  }
  return false;
}

export function isAnyIosDevice(ua: string, extras?: ScreenExtras): boolean {
  return isDisguisedIosPhone(ua, extras) || isDisguisedIosTablet(ua, extras);
}
