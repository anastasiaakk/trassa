import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./auth.js";

const ADMIN_HEADER = "x-trassa-admin-token";

export type AdminJwtPayload = {
  sub: string;
  emailNorm: string;
  role: "admin";
};

export function signAdminToken(emailNorm: string): string {
  const payload: AdminJwtPayload = { sub: emailNorm, emailNorm, role: "admin" };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "12h" });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as AdminJwtPayload;
  if (decoded?.role !== "admin" || !decoded.emailNorm) {
    throw new Error("Invalid admin token");
  }
  return decoded;
}

export function readAdminTokenFromRequest(req: Request): string | null {
  const h = req.headers[ADMIN_HEADER];
  if (typeof h === "string" && h.length > 0) return h;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    const t = readAdminTokenFromRequest(req);
    if (!t) {
      res.status(401).json({ ok: false, error: "Требуется вход администратора." });
      return;
    }
    const payload = verifyAdminToken(t);
    (req as Request & { adminAuth?: AdminJwtPayload }).adminAuth = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Сессия администратора недействительна." });
  }
}
