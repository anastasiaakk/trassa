import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { requireAuthOrAdmin } from "../middleware/requireAuthOrAdmin.js";
import {
  ADMIN_ONLY_PORTAL_KEYS,
  AUTH_PORTAL_KEYS,
  isValidPortalKey,
} from "../portalKeys.js";

type KvRow = {
  key: string;
  value_json: string;
  updated_at: string;
  updated_by: string | null;
};

function readAllKv(): Record<string, unknown> {
  const rows = db.prepare("SELECT key, value_json FROM portal_kv").all() as KvRow[];
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value_json) as unknown;
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

function writeKv(key: string, value: unknown, updatedBy: string | null): void {
  const now = new Date().toISOString();
  const value_json = JSON.stringify(value);
  db.prepare(
    `INSERT INTO portal_kv (key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  ).run(key, value_json, now, updatedBy);
}

export const portalRouter = Router();

function readPortalVersion(): string | null {
  const updatedAt = db
    .prepare("SELECT MAX(updated_at) AS t FROM portal_kv")
    .get() as { t: string | null };
  return updatedAt?.t ?? null;
}

/** Лёгкий опрос для синхронизации между ПК (без тела всех ключей). */
portalRouter.get("/version", (_req: Request, res: Response) => {
  res.json({ ok: true, version: readPortalVersion() });
});

/** Все общие данные портала (чтение без входа — карта, техработы). */
portalRouter.get("/state", (_req: Request, res: Response) => {
  const data = readAllKv();
  res.json({
    ok: true,
    data,
    version: readPortalVersion(),
  });
});

portalRouter.get("/kv/:key", (req: Request, res: Response) => {
  const key = req.params.key;
  if (!isValidPortalKey(key)) {
    res.status(400).json({ ok: false, error: "Неизвестный ключ." });
    return;
  }
  const row = db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(key) as
    | { value_json: string }
    | undefined;
  if (!row) {
    res.json({ ok: true, value: null });
    return;
  }
  try {
    res.json({ ok: true, value: JSON.parse(row.value_json) as unknown });
  } catch {
    res.status(500).json({ ok: false, error: "Повреждённые данные на сервере." });
  }
});

const putSchema = z.object({
  value: z.unknown(),
});

function putKvHandler(req: Request, res: Response, updatedBy: string | null): void {
  const key = req.params.key;
  if (!isValidPortalKey(key)) {
    res.status(400).json({ ok: false, error: "Неизвестный ключ." });
    return;
  }
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректное тело запроса." });
    return;
  }
  writeKv(key, parsed.data.value, updatedBy);
  res.json({ ok: true, version: readPortalVersion() });
}

/** Глобальные настройки — только администратор /services. */
portalRouter.put("/kv/:key", requireAdmin, (req: Request, res: Response) => {
  const key = req.params.key;
  if (!ADMIN_ONLY_PORTAL_KEYS.has(key)) {
    res.status(403).json({ ok: false, error: "Этот ключ меняется только через вход пользователя портала." });
    return;
  }
  const admin = (req as Request & { adminAuth?: { emailNorm: string } }).adminAuth;
  putKvHandler(req, res, admin?.emailNorm ?? "admin");
});

/** Документы, календарь, мессенджер и т.д. — любой вошедший пользователь. */
portalRouter.put("/user-kv/:key", requireAuthOrAdmin, (req: Request, res: Response) => {
  const key = req.params.key;
  if (!AUTH_PORTAL_KEYS.has(key)) {
    res.status(403).json({ ok: false, error: "Этот ключ меняет только администратор." });
    return;
  }
  const auth = (req as Request & { auth?: { emailNorm: string } }).auth;
  const admin = (req as Request & { adminAuth?: { emailNorm: string } }).adminAuth;
  putKvHandler(req, res, auth?.emailNorm ?? admin?.emailNorm ?? "user");
});

/** Первичная загрузка с клиента (миграция localStorage → сервер). */
portalRouter.post("/bootstrap", requireAdmin, (req: Request, res: Response) => {
  const schema = z.object({ data: z.record(z.unknown()) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const admin = (req as Request & { adminAuth?: { emailNorm: string } }).adminAuth;
  let count = 0;
  for (const [key, value] of Object.entries(parsed.data.data)) {
    if (!isValidPortalKey(key)) continue;
    const existing = db.prepare("SELECT 1 FROM portal_kv WHERE key = ?").get(key);
    if (existing) continue;
    writeKv(key, value, admin?.emailNorm ?? "bootstrap");
    count++;
  }
  res.json({ ok: true, imported: count });
});
