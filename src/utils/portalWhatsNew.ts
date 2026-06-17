const STORAGE_KEY = "trassa-portal-v2-whatsnew-dismissed";

/** Баннер «Новый интерфейс» отключён. */
export function shouldShowPortalWhatsNew(): boolean {
  return false;
}

export function dismissPortalWhatsNew(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Скрыть баннер у всех, у кого он ещё не был закрыт. */
export function suppressPortalWhatsNewGlobally(): void {
  dismissPortalWhatsNew();
}
