const ADMIN_GLASS_DARK_KEY = "trassa-admin-glass-dark";

/** Тёмная glass-тема админки (иначе светлая «как карта»). */
export function loadAdminGlassPreferDark(defaultValue: boolean): boolean {
  try {
    const s = sessionStorage.getItem(ADMIN_GLASS_DARK_KEY);
    if (s === "1") return true;
    if (s === "0") return false;
  } catch {
    /* ignore */
  }
  return defaultValue;
}

export function saveAdminGlassPreferDark(preferDark: boolean): void {
  try {
    sessionStorage.setItem(ADMIN_GLASS_DARK_KEY, preferDark ? "1" : "0");
  } catch {
    /* ignore */
  }
}
