import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import {
  clientIp,
  readDeviceIdFromRequest,
  upsertPortalDevice,
} from "./deviceAccess.js";
import type { JwtPayload } from "./middleware/auth.js";
import { notifyAdminViolationSms } from "./adminAlertSms.js";

export type PortalViolationRow = {
  id: string;
  kind: string;
  device_id: string;
  device_label: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  ip: string;
  user_agent: string;
  browser: string;
  created_at: string;
};

const KIND_LABELS: Record<string, string> = {
  screenshot_keyboard: "Клавиши скриншота",
  screenshot_print: "Печать / PDF",
  screenshot_mobile_hint: "Скрытие экрана (моб.)",
  screenshot_mobile_focus: "Потеря фокуса (моб.)",
  screenshot_mobile_viewport: "Изменение экрана (моб.)",
  screenshot_copy: "Копирование",
  screenshot_context_menu: "Долгое нажатие / меню",
  screenshot_volume_keys: "Кнопки громкости (скриншот?)",
  screenshot_capture_api: "Захват экрана",
};

export function violationKindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind;
}

const ALLOWED_KINDS = new Set([
  "screenshot_keyboard",
  "screenshot_print",
  "screenshot_mobile_hint",
  "screenshot_mobile_focus",
  "screenshot_mobile_viewport",
  "screenshot_copy",
  "screenshot_context_menu",
  "screenshot_volume_keys",
  "screenshot_capture_api",
]);

export function recordPortalViolation(
  req: Request,
  kind: string,
  auth: JwtPayload | null,
  userName?: string | null,
  browserLabel?: string | null
): PortalViolationRow | null {
  const normalizedKind = kind.trim();
  if (!ALLOWED_KINDS.has(normalizedKind)) return null;

  const deviceId = readDeviceIdFromRequest(req);
  if (!deviceId) return null;

  upsertPortalDevice(req, deviceId, auth);

  const device = db
    .prepare("SELECT label FROM portal_devices WHERE id = ?")
    .get(deviceId) as { label: string } | undefined;

  const id = randomUUID();
  const now = new Date().toISOString();
  const ua = String(req.headers["user-agent"] ?? "").slice(0, 512);
  const ip = clientIp(req);
  const userId = auth?.sub ?? null;
  const userEmail = auth?.emailNorm ?? null;
  const name = userName?.trim().slice(0, 200) || null;
  const browser = browserLabel?.trim().slice(0, 120) || "";

  db.prepare(
    `INSERT INTO portal_violations
     (id, kind, device_id, device_label, user_id, user_email, user_name, ip, user_agent, browser, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    normalizedKind,
    deviceId,
    device?.label ?? "Устройство",
    userId,
    userEmail,
    name,
    ip,
    ua,
    browser,
    now
  );

  const row: PortalViolationRow = {
    id,
    kind: normalizedKind,
    device_id: deviceId,
    device_label: device?.label ?? "Устройство",
    user_id: userId,
    user_email: userEmail,
    user_name: name,
    ip,
    user_agent: ua,
    browser,
    created_at: now,
  };

  const who =
    name || userEmail || (userId ? `id ${userId}` : "гость без входа");
  const smsText = `ТрассА: ${who}, ${device?.label ?? deviceId} — попытка нарушения (${violationKindLabel(normalizedKind)}).`;
  void notifyAdminViolationSms(deviceId, smsText);

  return row;
}

export type PortalViolationListRow = PortalViolationRow & {
  device_banned: number;
};

export function listPortalViolations(limit = 200): PortalViolationListRow[] {
  const n = Math.min(Math.max(limit, 1), 500);
  return db
    .prepare(
      `SELECT v.id, v.kind, v.device_id, v.device_label, v.user_id, v.user_email, v.user_name,
              v.ip, v.user_agent, v.browser, v.created_at,
              COALESCE(d.banned, 0) AS device_banned
       FROM portal_violations v
       LEFT JOIN portal_devices d ON d.id = v.device_id
       ORDER BY v.created_at DESC
       LIMIT ?`
    )
    .all(n) as PortalViolationListRow[];
}

export function deletePortalViolation(id: string): boolean {
  const result = db.prepare("DELETE FROM portal_violations WHERE id = ?").run(id);
  return result.changes > 0;
}

export function clearPortalViolations(): number {
  const result = db.prepare("DELETE FROM portal_violations").run();
  return Number(result.changes);
}

export function violationRowToJson(row: PortalViolationListRow) {
  return {
    id: row.id,
    kind: row.kind,
    kindLabel: violationKindLabel(row.kind),
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    deviceBanned: row.device_banned === 1,
    userId: row.user_id,
    userEmail: row.user_email,
    userName: row.user_name,
    ip: row.ip,
    userAgent: row.user_agent,
    browser: row.browser || "",
    createdAt: row.created_at,
  };
}
