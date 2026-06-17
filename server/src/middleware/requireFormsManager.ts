import type { NextFunction, Request, Response } from "express";
import { db } from "../db.js";
import { defaultProfile, type ProfileSettingsData } from "../profileTypes.js";
import { readAdminTokenFromRequest, verifyAdminToken } from "./adminAuth.js";
import { readTokenFromRequest, verifyAccessToken } from "./auth.js";

export type FormsManagerAuth =
  | { kind: "admin"; emailNorm: string }
  | { kind: "portal"; emailNorm: string; profile: ProfileSettingsData };

function parseProfile(raw: string): ProfileSettingsData {
  try {
    const p = JSON.parse(raw) as Partial<ProfileSettingsData>;
    return defaultProfile({ email: p.email ?? "", ...p });
  } catch {
    return defaultProfile({ email: "" });
  }
}

/** Подрядчик — только заполнение назначенных таблиц, не создание. */
export function isContractorProfile(profile: ProfileSettingsData): boolean {
  const role = profile.roleLabel.toLowerCase();
  if (role.includes("подряд")) return true;
  if (profile.contractorCompanyName?.trim()) return true;
  return false;
}

export function isAssociationFormsManager(profile: ProfileSettingsData): boolean {
  const role = profile.roleLabel.toLowerCase();
  if (role.includes("радор") || role.includes("rador")) return true;
  if (role.includes("адо") || role.includes("ado")) return true;
  if (role.includes("ассоциац")) return true;
  if (role.includes("организ")) return true;
  return false;
}

export function canManageForms(profile: ProfileSettingsData): boolean {
  if (isContractorProfile(profile)) return false;
  return isAssociationFormsManager(profile);
}

/** Администратор /services или пользователь портала (РАДОР, организатор — не подрядчик). */
export function requireFormsManager(req: Request, res: Response, next: NextFunction): void {
  const adminToken = readAdminTokenFromRequest(req);
  if (adminToken) {
    try {
      const payload = verifyAdminToken(adminToken);
      (req as Request & { formsManager?: FormsManagerAuth }).formsManager = {
        kind: "admin",
        emailNorm: payload.emailNorm,
      };
      next();
      return;
    } catch {
      /* try portal */
    }
  }

  try {
    const t = readTokenFromRequest(req);
    if (!t) {
      res.status(401).json({
        ok: false,
        error: "Требуется вход (администратор или пользователь РАДОР/организатор).",
      });
      return;
    }
    const payload = verifyAccessToken(t);
    const row = db.prepare("SELECT profile_json FROM users WHERE id = ?").get(payload.sub) as
      | { profile_json: string }
      | undefined;
    if (!row) {
      res.status(401).json({ ok: false, error: "Пользователь не найден." });
      return;
    }
    const profile = parseProfile(row.profile_json);
    if (!canManageForms(profile)) {
      res.status(403).json({
        ok: false,
        error: "Создание таблиц доступно РАДОР/организаторам и администратору, не подрядчикам.",
      });
      return;
    }
    (req as Request & { formsManager?: FormsManagerAuth }).formsManager = {
      kind: "portal",
      emailNorm: payload.emailNorm,
      profile,
    };
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Сессия недействительна. Войдите снова." });
  }
}
