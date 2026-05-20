import type { NextFunction, Request, Response } from "express";
import { readAdminTokenFromRequest, verifyAdminToken } from "./adminAuth.js";
import { readTokenFromRequest, verifyAccessToken } from "./auth.js";

/** Вход пользователя портала или администратора /services. */
export function requireAuthOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminToken = readAdminTokenFromRequest(req);
  if (adminToken) {
    try {
      const payload = verifyAdminToken(adminToken);
      (req as Request & { adminAuth?: typeof payload }).adminAuth = payload;
      next();
      return;
    } catch {
      /* try user token */
    }
  }

  try {
    const t = readTokenFromRequest(req);
    if (!t) {
      res.status(401).json({ ok: false, error: "Требуется вход." });
      return;
    }
    const payload = verifyAccessToken(t);
    (req as Request & { auth?: typeof payload }).auth = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Сессия недействительна. Войдите снова." });
  }
}
