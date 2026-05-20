import type { Request, Response } from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db.js";
import { signAdminToken } from "../middleware/adminAuth.js";
import { validatePasswordPolicy } from "../passwordPolicy.js";

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(500),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const adminRouter = Router();

adminRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const emailNorm = normalizeEmail(parsed.data.email);
  const row = db
    .prepare("SELECT email_norm, password_hash FROM admin_users WHERE email_norm = ?")
    .get(emailNorm) as { email_norm: string; password_hash: string } | undefined;
  if (!row) {
    res.status(401).json({ ok: false, error: "Неверный e-mail или пароль." });
    return;
  }
  const ok = await bcrypt.compare(parsed.data.password, row.password_hash);
  if (!ok) {
    res.status(401).json({ ok: false, error: "Неверный e-mail или пароль." });
    return;
  }
  const adminToken = signAdminToken(emailNorm);
  res.json({ ok: true, adminToken, emailNorm });
});

adminRouter.post("/password", async (req: Request, res: Response) => {
  const schema = z.object({
    email: z.string().email().max(320),
    oldPassword: z.string().min(1).max(500),
    newPassword: z.string().min(1).max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const policy = validatePasswordPolicy(parsed.data.newPassword);
  if (policy) {
    res.status(400).json({ ok: false, error: policy });
    return;
  }
  const emailNorm = normalizeEmail(parsed.data.email);
  const row = db
    .prepare("SELECT password_hash FROM admin_users WHERE email_norm = ?")
    .get(emailNorm) as { password_hash: string } | undefined;
  if (!row) {
    res.status(401).json({ ok: false, error: "Пользователь не найден." });
    return;
  }
  const match = await bcrypt.compare(parsed.data.oldPassword, row.password_hash);
  if (!match) {
    res.status(401).json({ ok: false, error: "Неверный текущий пароль." });
    return;
  }
  const password_hash = await bcrypt.hash(parsed.data.newPassword, 12);
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE email_norm = ?").run(
    password_hash,
    emailNorm
  );
  res.json({ ok: true });
});
