/**
 * Локальная авторизация администратора (отдельно от кабинетов ролей).
 * Сессия в sessionStorage — закрытие вкладки = выход.
 * Встроенные учётки: Ксения и Анастасия (добавляются при первом запуске / миграции).
 */

import {
  adminApiChangePassword,
  adminApiLogin,
  getAdminApiToken,
  setAdminApiToken,
} from "../api/adminApi";
import { hashPassword } from "./localAuth";
import { isAuthApiEnabled } from "./authMode";
import { validatePasswordPolicy } from "./passwordPolicy";

const ADMIN_USERS_KEY = "trassa-admin-users-v1";
const SESSION_KEY = "trassa-admin-session-v1";

export type AdminCabinetId = "ksenia" | "anastasia" | "anna";

export type BuiltinAdminAccount = {
  email: string;
  password: string;
  displayName: string;
  cabinetId: AdminCabinetId;
  orgLabel?: string;
  /** null — все вкладки; иначе только перечисленные id разделов. */
  allowedTabIds?: string[] | null;
};

/** Учётки по умолчанию (латиница + цифры, ≥8). Смените пароли после входа. */
export const BUILTIN_ADMIN_ACCOUNTS: BuiltinAdminAccount[] = [
  {
    email: "ksenia@trassa.local",
    password: "KseniaAdm8",
    displayName: "Ксения",
    cabinetId: "ksenia",
  },
  {
    email: "anastasia@trassa.local",
    password: "NastiaAdm8",
    displayName: "Анастасия",
    cabinetId: "anastasia",
  },
  {
    email: "anna@indorsoft.local",
    password: "AnnaInd8",
    displayName: "Анна Алеутдинова",
    orgLabel: "Индорсофт",
    cabinetId: "anna",
    allowedTabIds: ["home", "users", "specs", "tables", "map", "orgs"],
  },
];

/** Старая учётка admin@… из ранних версий — узнаём по email в хранилище */
const LEGACY_ADMIN_EMAIL = "admin@trassa.local";

type AdminUserRecord = {
  emailNorm: string;
  passwordHash: string;
};

type AdminUsersFile = {
  version: 1;
  users: AdminUserRecord[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readFile(): AdminUsersFile {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (!raw) return { version: 1, users: [] };
    const parsed = JSON.parse(raw) as AdminUsersFile;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users)) {
      return { version: 1, users: [] };
    }
    return parsed;
  } catch {
    return { version: 1, users: [] };
  }
}

function writeFile(file: AdminUsersFile): void {
  localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(file));
}

/**
 * Добавляет встроенных администраторов и при необходимости учётку из старых версий.
 */
export async function ensureBuiltinAdminUsers(): Promise<void> {
  const file = readFile();
  const existing = new Set(file.users.map((u) => u.emailNorm));
  let changed = false;

  for (const acc of BUILTIN_ADMIN_ACCOUNTS) {
    const norm = normalizeEmail(acc.email);
    if (!existing.has(norm)) {
      file.users.push({
        emailNorm: norm,
        passwordHash: await hashPassword(acc.password),
      });
      existing.add(norm);
      changed = true;
    }
  }

  if (changed) writeFile(file);
}

/** @deprecated используйте ensureBuiltinAdminUsers */
export async function ensureDefaultAdminUser(): Promise<void> {
  await ensureBuiltinAdminUsers();
}

/** Подсказка для формы входа (первая учётка) */
export function getDefaultAdminCredentials(): { email: string; password: string } {
  const first = BUILTIN_ADMIN_ACCOUNTS[0];
  return { email: first.email, password: first.password };
}

export type AdminCabinetInfo = {
  cabinetId: AdminCabinetId;
  displayName: string;
  orgLabel?: string;
  allowedTabIds: string[] | null;
};

function builtinAccountForEmail(emailNorm: string | null | undefined): BuiltinAdminAccount | null {
  if (!emailNorm) return null;
  const norm = normalizeEmail(emailNorm);
  return BUILTIN_ADMIN_ACCOUNTS.find((acc) => normalizeEmail(acc.email) === norm) ?? null;
}

function cabinetInfoFromAccount(acc: BuiltinAdminAccount): AdminCabinetInfo {
  return {
    cabinetId: acc.cabinetId,
    displayName: acc.displayName,
    orgLabel: acc.orgLabel,
    allowedTabIds: acc.allowedTabIds ?? null,
  };
}

export function getAdminAllowedTabIds(cabinetId: AdminCabinetId): string[] | null {
  const acc = BUILTIN_ADMIN_ACCOUNTS.find((a) => a.cabinetId === cabinetId);
  if (!acc || acc.allowedTabIds == null) return null;
  return acc.allowedTabIds;
}

export function isAdminTabAllowed(
  cabinetId: AdminCabinetId,
  tabId: string,
  emailNorm?: string | null,
): boolean {
  const byEmail = builtinAccountForEmail(emailNorm);
  const allowed = byEmail?.allowedTabIds ?? getAdminAllowedTabIds(cabinetId);
  if (!allowed) return true;
  return allowed.includes(tabId);
}

export function getAdminCabinetInfo(emailNorm: string | null): AdminCabinetInfo {
  const acc = builtinAccountForEmail(emailNorm);
  if (acc) return cabinetInfoFromAccount(acc);
  if (!emailNorm) {
    return { cabinetId: "ksenia", displayName: "Администратор", allowedTabIds: null };
  }
  if (normalizeEmail(emailNorm) === normalizeEmail(LEGACY_ADMIN_EMAIL)) {
    return { cabinetId: "ksenia", displayName: "Администратор", allowedTabIds: null };
  }
  return { cabinetId: "ksenia", displayName: emailNorm, allowedTabIds: null };
}

function isLikelyNetworkError(status: number | undefined, message: string): boolean {
  if (status === 0) return true;
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    message.includes("Сервер не ответил")
  );
}

function adminLoginNetworkHint(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname } = window.location;
  if (protocol === "file:") {
    return " Проверьте интернет и доступность https://trassa.duckdns.org/api/health.";
  }
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    /^192\.168\.\d+\.\d+$/.test(hostname) ||
    /^10\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
    return " Запустите API: npm run dev:all (или npm run server:dev в папке server/).";
  }
  if (hostname === "trassa.duckdns.org" || hostname.endsWith(".duckdns.org")) {
    return " Проверьте интернет или повторите через минуту.";
  }
  return " Проверьте, что API доступен по /api на этом же адресе.";
}

async function loginAdminLocally(emailNorm: string, password: string): Promise<boolean> {
  await ensureBuiltinAdminUsers();
  const file = readFile();
  const user = file.users.find((u) => u.emailNorm === emailNorm);
  if (!user) return false;
  const h = await hashPassword(password);
  if (h !== user.passwordHash) return false;
  sessionStorage.setItem(SESSION_KEY, emailNorm);
  return true;
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm || !password) {
    return { ok: false, error: "Введите e-mail и пароль." };
  }

  if (isAuthApiEnabled()) {
    const api = await adminApiLogin(emailNorm, password);
    if (api.ok) {
      setAdminApiToken(api.adminToken);
      sessionStorage.setItem(SESSION_KEY, emailNorm);
      void import("./portalSync").then(({ refreshPortalStateFromServer }) =>
        refreshPortalStateFromServer({ force: true })
      );
      return { ok: true };
    }
    if (api.status === 429 || api.error.toLowerCase().includes("слишком много")) {
      return {
        ok: false,
        error:
          "Слишком много попыток входа. Подождите 15 минут или перезапустите API (ksenia@trassa.local / KseniaAdm8).",
      };
    }
    if (isLikelyNetworkError(api.status, api.error)) {
      return {
        ok: false,
        error: `Не удалось связаться с API (${api.error}).${adminLoginNetworkHint()}`,
      };
    }
    return {
      ok: false,
      error: api.error,
    };
  }

  const localOk = await loginAdminLocally(emailNorm, password);
  if (!localOk) {
    return { ok: false, error: "Неверный логин или пароль." };
  }
  return { ok: true };
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY);
  setAdminApiToken(null);
}

export function getAdminSessionEmail(): string | null {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Сбрасывает устаревшую сессию без API-токена (после старого «локального» входа). */
export function reconcileAdminSession(): void {
  if (!isAuthApiEnabled()) return;
  if (getAdminSessionEmail() && !getAdminApiToken()) {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function isAdminLoggedIn(): boolean {
  reconcileAdminSession();
  if (!getAdminSessionEmail()) return false;
  if (isAuthApiEnabled() && !getAdminApiToken()) return false;
  return true;
}

export async function updateAdminPassword(
  oldPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = getAdminSessionEmail();
  if (!session) {
    return { ok: false, error: "Сессия администратора не найдена." };
  }
  const pwErr = validatePasswordPolicy(newPassword);
  if (pwErr) {
    return { ok: false, error: pwErr };
  }

  if (isAuthApiEnabled()) {
    const api = await adminApiChangePassword(session, oldPassword, newPassword);
    if (!api.ok) return api;
  }

  const file = readFile();
  const user = file.users.find((u) => u.emailNorm === session);
  if (!user) {
    return { ok: false, error: "Учётная запись не найдена." };
  }
  if ((await hashPassword(oldPassword)) !== user.passwordHash) {
    return { ok: false, error: "Неверный текущий пароль." };
  }
  user.passwordHash = await hashPassword(newPassword);
  writeFile(file);
  return { ok: true };
}
