export const INTRO_DONE_SESSION_KEY = "trassa_intro_done";
export const INTRO_PENDING_ATTR = "data-intro-pending";
export const PAGE1_HANDOFF_ATTR = "data-page1-handoff";

/** Сплэш уже проигран в этом загрузке документа (без повтора при SPA-навигации на главную). */
let entrySplashPlayedThisDocument = false;

/** Показывать entry-splash: при каждой перезагрузке страницы, но не при возврате на / внутри SPA. */
export function shouldPlayEntrySplash(): boolean {
  return !entrySplashPlayedThisDocument;
}

export function markEntrySplashPlayed(): void {
  entrySplashPlayedThisDocument = true;
}

export function isIntroDoneForRouting(): boolean {
  try {
    return sessionStorage.getItem(INTRO_DONE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroDoneForRouting(): void {
  markEntrySplashPlayed();
  try {
    sessionStorage.setItem(INTRO_DONE_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Чёрный экран до React, если будет сплэш (без синей заливки). */
export function markIntroPendingEarly(): void {
  if (typeof document === "undefined") return;
  try {
    if (!shouldPlayEntrySplash() && isIntroDoneForRouting()) return;
    document.documentElement.setAttribute(INTRO_PENDING_ATTR, "1");
    document.documentElement.style.backgroundColor = "#000";
    document.body.style.backgroundColor = "#000";
  } catch {
    /* ignore */
  }
}

export function clearIntroPendingEarly(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute(INTRO_PENDING_ATTR);
}

export function beginPage1Handoff(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(PAGE1_HANDOFF_ATTR, "1");
}

export function setPage1HandoffDurationMs(ms: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--page1-handoff-ms", `${ms}ms`);
}

export function endPage1Handoff(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute(PAGE1_HANDOFF_ATTR);
  document.documentElement.style.removeProperty("--page1-handoff-ms");
}

/**
 * До React: прямой заход на карту без интро → страница 1 со сплэшем.
 * После сплэша в сессии (#/services и обновление страницы) карта открывается нормально.
 */
export function ensureIntroRoute(): void {
  if (typeof window === "undefined") return;
  markIntroPendingEarly();
  try {
    const pathname = window.location.pathname.replace(/\/$/, "") || "/";
    const hash = window.location.hash;
    const hashPath = hash ? hash.replace(/^#/, "") || "/" : "";

    /* Ссылка вида /services без hash — переводим в HashRouter */
    if ((!hash || hash === "#" || hash === "#/") && /\/services$/i.test(pathname)) {
      const suffix = `${window.location.search || ""}`;
      window.location.replace(`${window.location.origin}${suffix}#/services`);
      return;
    }

    if (!hashPath.startsWith("/services")) return;

    if (isIntroDoneForRouting()) return;

    window.location.hash = "#/";
  } catch {
    /* ignore */
  }
}
