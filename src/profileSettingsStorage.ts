export const PROFILE_SETTINGS_KEY = "trassa-profile-settings-v1";
export const CABINET_THEME_KEY = "trassa-cabinet-theme";
export const PAGE4_FINTECH_DARK_MIGRATED_KEY = "trassa-page4-fintech-dark-v1";

export type ProfileSettingsData = {
  firstName: string;
  lastName: string;
  roleLabel: string;
  /** Стабильный id для мессенджера (разные аккаунты / кабинеты — разные uid в переписке) */
  messengerUid: string;
  /** Наименование организации — на главной кабинета подрядчика (page4) */
  contractorCompanyName: string;
  email: string;
  phone: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  /** Спецификация (подгруппа) — студент и подрядчик; задаётся при регистрации или в кабинете студента */
  specializationId: string;
};

const defaults: ProfileSettingsData = {
  firstName: "Александр",
  lastName: "",
  roleLabel: "Организатор",
  messengerUid: "",
  contractorCompanyName: "",
  email: "",
  phone: "",
  notifyEmail: true,
  notifyPush: false,
  specializationId: "",
};

export function loadProfileSettings(): ProfileSettingsData {
  try {
    const raw = localStorage.getItem(PROFILE_SETTINGS_KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveProfileSettings(data: ProfileSettingsData) {
  localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(data));
}

export type CabinetTheme = "light" | "dark";

export const CABINET_UNIFIED_LIGHT_KEY = "trassa-cabinet-unified-light-v1";

export function migrateContractorToFintechDark(): boolean {
  try {
    if (localStorage.getItem(PAGE4_FINTECH_DARK_MIGRATED_KEY)) return false;
    localStorage.setItem(PAGE4_FINTECH_DARK_MIGRATED_KEY, "1");
    return false;
  } catch {
    return false;
  }
}

/** Сбрасывает автоматическую тёмную тему подрядчика (legacy) на общую светлую. */
export function reconcileUnifiedCabinetLight(): boolean {
  try {
    if (localStorage.getItem(CABINET_UNIFIED_LIGHT_KEY)) return false;
    localStorage.setItem(CABINET_UNIFIED_LIGHT_KEY, "1");
    const hadPage4AutoDark = localStorage.getItem(PAGE4_FINTECH_DARK_MIGRATED_KEY);
    if (hadPage4AutoDark && localStorage.getItem(CABINET_THEME_KEY) === "dark") {
      localStorage.setItem(CABINET_THEME_KEY, "light");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Единая светлая тема по умолчанию для всех кабинетов */
export function defaultCabinetThemeForPath(_cabinetPath?: string): CabinetTheme {
  return "light";
}

export function loadCabinetTheme(cabinetPath?: string): CabinetTheme {
  try {
    const s = localStorage.getItem(CABINET_THEME_KEY);
    if (s === "dark" || s === "light") return s;
  } catch {
    /* ignore */
  }
  return defaultCabinetThemeForPath(cabinetPath);
}

export const CABINET_THEME_CHANGED = "trassa-cabinet-theme-changed";

export function saveCabinetTheme(theme: CabinetTheme) {
  localStorage.setItem(CABINET_THEME_KEY, theme);
  window.dispatchEvent(new Event(CABINET_THEME_CHANGED));
}
