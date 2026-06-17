import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { isAdminSmsConfigured } from "../adminAlertSms.js";
import {
  clearPortalViolations,
  deletePortalViolation,
  listPortalViolations,
  recordPortalViolation,
  violationRowToJson,
} from "../portalViolations.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { readTokenFromRequest, verifyAccessToken } from "../middleware/auth.js";
import { isViolationsGuardEnabled } from "../violationsGuard.js";

export const violationsRouter = Router();

const reportSchema = z.object({
  kind: z.string().min(1).max(64),
  userName: z.string().max(200).optional(),
  browser: z.string().max(120).optional(),
});

const reportCounts = new Map<string, { count: number; resetAt: number }>();
const REPORT_LIMIT = 12;
const REPORT_WINDOW_MS = 60_000;

function rateLimitKey(req: Request): string {
  const deviceId = String(req.headers["x-trassa-device-id"] ?? "").trim();
  return deviceId || req.ip || "unknown";
}

function allowReport(req: Request): boolean {
  const key = rateLimitKey(req);
  const now = Date.now();
  let entry = reportCounts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + REPORT_WINDOW_MS };
    reportCounts.set(key, entry);
  }
  entry.count += 1;
  return entry.count <= REPORT_LIMIT;
}

violationsRouter.post("/report", (req: Request, res: Response) => {
  if (!isViolationsGuardEnabled()) {
    res.json({ ok: true, disabled: true });
    return;
  }

  if (!allowReport(req)) {
    res.status(429).json({ ok: false, error: "Слишком много запросов." });
    return;
  }

  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }

  let auth = null;
  try {
    const t = readTokenFromRequest(req);
    if (t) auth = verifyAccessToken(t);
  } catch {
    auth = null;
  }

  const row = recordPortalViolation(
    req,
    parsed.data.kind,
    auth,
    parsed.data.userName ?? null,
    parsed.data.browser ?? null
  );
  if (!row) {
    res.status(400).json({ ok: false, error: "Не удалось зафиксировать событие." });
    return;
  }

  res.json({ ok: true, id: row.id });
});

export const adminViolationsRouter = Router();

adminViolationsRouter.get("/violations", requireAdmin, (_req: Request, res: Response) => {
  const violations = listPortalViolations(250).map(violationRowToJson);
  res.json({
    ok: true,
    violations,
    smsConfigured: isAdminSmsConfigured(),
    guardEnabled: isViolationsGuardEnabled(),
  });
});

adminViolationsRouter.delete("/violations/:id", requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ ok: false, error: "Не указан id." });
    return;
  }
  if (!deletePortalViolation(id)) {
    res.status(404).json({ ok: false, error: "Запись не найдена." });
    return;
  }
  res.json({ ok: true });
});

adminViolationsRouter.delete("/violations", requireAdmin, (_req: Request, res: Response) => {
  const deleted = clearPortalViolations();
  res.json({ ok: true, deleted });
});
