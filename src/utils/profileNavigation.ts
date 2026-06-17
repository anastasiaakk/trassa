import type { NavigateFunction } from "react-router-dom";

export const PROFILE_RETURN_PATH_KEY = "trassa-profile-return-path";
export const CABINET_CONTEXT_KEY = "trassa-cabinet-context";
const CABINET_SCROLL_Y_KEY = "trassa-cabinet-scroll-y";

export function isCabinetRoutePath(path: string): boolean {
  return resolveCabinetBase(path) !== null;
}

export function isProfileCabinetTransition(from: string, to: string): boolean {
  return (
    (from === "/profile" && isCabinetRoutePath(to)) ||
    (to === "/profile" && isCabinetRoutePath(from))
  );
}

/** Запомнить scroll кабинета перед переходом в /profile. */
export function stashCabinetScrollPosition(): void {
  try {
    sessionStorage.setItem(CABINET_SCROLL_Y_KEY, String(Math.round(window.scrollY)));
  } catch {
    /* ignore */
  }
}

/** Восстановить scroll после возврата из /profile (один раз). */
export function restoreCabinetScrollPosition(): void {
  let y: number | null = null;
  try {
    const raw = sessionStorage.getItem(CABINET_SCROLL_Y_KEY);
    sessionStorage.removeItem(CABINET_SCROLL_Y_KEY);
    if (raw) {
      const parsed = Number(raw);
      y = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
  } catch {
    y = null;
  }
  if (y == null) return;
  const apply = () => window.scrollTo({ top: y!, left: 0, behavior: "auto" });
  requestAnimationFrame(() => requestAnimationFrame(apply));
}

export function readPortalRole(): string | null {
  try {
    return sessionStorage.getItem("trassaPortalRole");
  } catch {
    return null;
  }
}

export function resolveCabinetBase(path: string): string | null {
  if (path === "/page4" || path.startsWith("/page4/")) return "/page4";
  if (path === "/page5" || path.startsWith("/page5/")) return "/page5";
  if (path === "/page6" || path.startsWith("/page6/")) return "/page6";
  if (path === "/cabinet-school" || path.startsWith("/cabinet-school/")) return "/cabinet-school";
  if (path === "/cabinet-spo" || path.startsWith("/cabinet-spo/")) return "/cabinet-spo";
  return null;
}

function isProfileReturnPath(path: string): boolean {
  return Boolean(path) && path !== "/profile" && !path.startsWith("/profile/");
}

export function readCabinetContext(): string | null {
  try {
    const raw = sessionStorage.getItem(CABINET_CONTEXT_KEY);
    return raw && resolveCabinetBase(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function rememberCabinetContext(path: string): void {
  const base = resolveCabinetBase(path);
  if (!base) return;
  try {
    sessionStorage.setItem(CABINET_CONTEXT_KEY, base);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Запомнить вход в кабинет (из админки или после логина). */
export function rememberCabinetEntry(path: string): void {
  const base = resolveCabinetBase(path);
  if (!base) return;
  rememberCabinetContext(path);
  rememberProfileReturnPath(path);

  try {
    if (base === "/cabinet-school") {
      sessionStorage.setItem("trassaPortalRole", "0");
      sessionStorage.removeItem("trassaInstitutionProfile");
      return;
    }
    if (base === "/cabinet-spo") {
      sessionStorage.setItem("trassaPortalRole", "1");
      sessionStorage.removeItem("trassaInstitutionProfile");
      return;
    }
    if (base === "/page4") {
      sessionStorage.setItem("trassaPortalRole", "2");
      sessionStorage.removeItem("trassaInstitutionProfile");
      return;
    }
    if (base === "/page5") {
      sessionStorage.setItem("trassaPortalRole", "3");
      sessionStorage.setItem("trassaInstitutionProfile", "rador");
      return;
    }
    if (base === "/page6") {
      sessionStorage.setItem("trassaPortalRole", "3");
      sessionStorage.setItem("trassaInstitutionProfile", "ado");
    }
  } catch {
    /* ignore */
  }
}

export function rememberProfileReturnPath(path: string): void {
  if (!isProfileReturnPath(path)) return;
  try {
    sessionStorage.setItem(PROFILE_RETURN_PATH_KEY, path);
    rememberCabinetContext(path);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Куда вернуться из /profile, если react-router state потерялся. */
export function resolveProfileReturnPath(stateFrom?: string | null): string {
  if (stateFrom && isProfileReturnPath(stateFrom)) return stateFrom;

  try {
    const stored = sessionStorage.getItem(PROFILE_RETURN_PATH_KEY);
    if (stored && isProfileReturnPath(stored)) return stored;
  } catch {
    /* ignore */
  }

  const context = readCabinetContext();
  if (context) return context;

  const portalRole = readPortalRole();
  if (portalRole === "0") return "/cabinet-school";
  if (portalRole === "1") return "/cabinet-spo";
  if (portalRole === "2") return "/page4";
  if (portalRole === "3") {
    try {
      return sessionStorage.getItem("trassaInstitutionProfile") === "ado" ? "/page6" : "/page5";
    } catch {
      return "/page5";
    }
  }
  return "/page5";
}

export function navigateToProfileSettings(navigate: NavigateFunction, fromPath: string): void {
  rememberProfileReturnPath(fromPath);
  if (isCabinetRoutePath(fromPath)) {
    stashCabinetScrollPosition();
  }
  navigate("/profile", { state: { from: fromPath }, preventScrollReset: true });
}

export function isContractorCabinetPath(path: string): boolean {
  return path === "/page4" || path.startsWith("/page4/");
}
