import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { db } from "./db.js";
import { broadcastDeviceAccess } from "./deviceAccessHub.js";
import type { JwtPayload } from "./middleware/auth.js";
import {
  buildDetailedDeviceLabel,
  type DeviceLabelExtras,
} from "./deviceLabelDetail.js";
import {
  MODEL_CONFIDENCE,
  pickBetterStoredModel,
  resolveDeviceModelBest,
  resolveDeviceModelName,
  type ResolvedDeviceModel,
} from "./deviceModelResolver.js";
import { primaryModelFromLabel, downgradeFalseIphone15Pro } from "./iphoneModels.js";
import { reconcileAppleModelWithGpu } from "./appleGpuFingerprint.js";
import { resolveIpGeoLocation } from "./deviceGeoIp.js";
import {
  attachPortalSessionCookie,
  GATE_HOLD_CODE,
  parseClientSessionContext,
  readClientSessionId,
  readClientSessionIdFromQuery,
} from "./portalClientSession.js";

/** Точность IP-геолокации (метры). */
export const IP_GEO_ACCURACY_M = 25_000;

export const DEVICE_ID_HEADER = "x-trassa-device-id";
export const DEVICE_LABEL_HEADER = "x-trassa-device-label";
export const DEVICE_SCREEN_W_HEADER = "x-trassa-screen-w";
export const DEVICE_SCREEN_H_HEADER = "x-trassa-screen-h";
export const DEVICE_DPR_HEADER = "x-trassa-dpr";
export const DEVICE_GPU_RENDERER_HEADER = "x-trassa-gpu-renderer";
export const DEVICE_IOS_MAJOR_HEADER = "x-trassa-ios-major";
export const DEVICE_MODEL_HEADER = "x-trassa-device-model";
export const DEVICE_MODEL_CONFIDENCE_HEADER = "x-trassa-model-confidence";
export const DEVICE_MODEL_SOURCE_HEADER = "x-trassa-model-source";
export const DEVICE_HINT_MODEL_HEADER = "x-trassa-hint-model";
export const DEVICE_GEO_LAT_HEADER = "x-trassa-geo-lat";
export const DEVICE_GEO_LNG_HEADER = "x-trassa-geo-lng";
export const DEVICE_GEO_ACCURACY_HEADER = "x-trassa-geo-accuracy";

export const DEVICE_BAN_MESSAGE =
  "Сервис временно недоступен. Попробуйте позже или обратитесь к администратору организации.";

export const DEVICE_BAN_CODE = GATE_HOLD_CODE;
export const LEGACY_DEVICE_BAN_CODE = "DEVICE_BANNED";

export type PortalDeviceRow = {
  id: string;
  label: string;
  user_agent: string;
  ip_last: string;
  user_id: string | null;
  user_email: string | null;
  first_seen_at: string;
  last_seen_at: string;
  banned: number;
  banned_at: string | null;
  banned_by: string | null;
  admin_note: string;
  screen_w?: number | null;
  screen_h?: number | null;
  screen_dpr?: number | null;
  marketing_model?: string;
  model_confidence?: number;
  model_source?: string;
  is_personal?: number;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_accuracy_m?: number | null;
  geo_updated_at?: string | null;
};

export type PortalDeviceVisitRow = {
  id: string;
  device_id: string;
  seen_at: string;
  ip: string;
  user_id: string | null;
  user_email: string | null;
};

/** Новая сессия, если с прошлого визита прошло больше 5 минут. */
const VISIT_SESSION_GAP_MS = 5 * 60 * 1000;

function isSqliteBusyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /SQLITE_BUSY|database is locked/i.test(msg);
}

function runWithSqliteRetry<T>(fn: () => T, attempts = 6): T {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (err) {
      lastErr = err;
      if (!isSqliteBusyError(err) || i === attempts - 1) throw err;
      const end = Date.now() + 25 * (i + 1);
      while (Date.now() < end) {
        /* spin until busy lock clears */
      }
    }
  }
  throw lastErr;
}

export function readDeviceIdFromRequest(req: Request): string | null {
  return readClientSessionId(req);
}

export function readDeviceIdFromQuery(req: Request): string | null {
  return readClientSessionIdFromQuery(req);
}

export type DeviceGeoReading = {
  lat: number;
  lng: number;
  accuracyM: number;
};

function shouldReplaceGeo(
  prev: {
    geo_lat?: number | null;
    geo_lng?: number | null;
    geo_accuracy_m?: number | null;
    geo_updated_at?: string | null;
  },
  next: DeviceGeoReading
): boolean {
  if (prev.geo_lat == null || prev.geo_lng == null) return true;
  if (!prev.geo_updated_at) return true;
  const age = Date.now() - new Date(prev.geo_updated_at).getTime();
  return age > 3 * 60_000;
}

function scheduleDeviceGeoFromRequest(req: Request, deviceId: string): void {
  void refreshDeviceGeoFromIp(req, deviceId);
}

async function refreshDeviceGeoFromIp(req: Request, deviceId: string): Promise<void> {
  const ip = clientIp(req);
  const ipGeo = await resolveIpGeoLocation(ip);
  if (!ipGeo) return;
  applyDeviceGeo(deviceId, {
    lat: ipGeo.lat,
    lng: ipGeo.lng,
    accuracyM: ipGeo.accuracyM,
  });
}

function applyDeviceGeo(deviceId: string, geo: DeviceGeoReading): void {
  const row = db
    .prepare(
      `SELECT geo_lat, geo_lng, geo_accuracy_m, geo_updated_at FROM portal_devices WHERE id = ?`
    )
    .get(deviceId) as PortalDeviceRow | undefined;
  if (!row || !shouldReplaceGeo(row, geo)) return;
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE portal_devices SET geo_lat = ?, geo_lng = ?, geo_accuracy_m = ?, geo_updated_at = ? WHERE id = ?`
  ).run(geo.lat, geo.lng, geo.accuracyM, now, deviceId);
}

export function clientIp(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || "unknown";
}

function titleDeviceName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, " ");
  if (!s) return s;
  if (s === s.toUpperCase() && s.length <= 24) {
    return s
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return s;
}

export function formatDeviceLabel(userAgent: string, extras?: DeviceLabelExtras): string {
  return buildDetailedDeviceLabel(userAgent, extras);
}

function readScreenExtrasFromRequest(req: Request): DeviceLabelExtras | undefined {
  const ctx = parseClientSessionContext(req);
  const screenW = ctx.screenW;
  const screenH = ctx.screenH;
  const devicePixelRatio = ctx.devicePixelRatio;
  const iosMajor = ctx.iosMajor;
  const gpuRenderer = ctx.gpuRenderer;
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH)) {
    if (!gpuRenderer) return undefined;
  }
  const dpr = Number.isFinite(devicePixelRatio) ? devicePixelRatio : undefined;
  return {
    screenW: Number.isFinite(screenW) ? screenW : undefined,
    screenH: Number.isFinite(screenH) ? screenH : undefined,
    devicePixelRatio: dpr,
    physicalW:
      screenW != null && Number.isFinite(screenW) && dpr
        ? Math.round(screenW * dpr)
        : undefined,
    physicalH:
      screenH != null && Number.isFinite(screenH) && dpr
        ? Math.round(screenH * dpr)
        : undefined,
    gpuRenderer,
    iosMajor: Number.isFinite(iosMajor) ? iosMajor : undefined,
  };
}

function normalizeStoredAppleModel(
  stored: { name: string; confidence: number },
  userAgent: string,
  extras?: DeviceLabelExtras
): { name: string; confidence: number } {
  const gpuFix = reconcileAppleModelWithGpu(stored.name, extras);
  const legacyFix = downgradeFalseIphone15Pro(
    stored.name,
    userAgent,
    extras?.screenW,
    extras?.screenH
  );
  const name = gpuFix ?? legacyFix ?? stored.name;
  if (name !== stored.name) {
    return { name, confidence: MODEL_CONFIDENCE.APPLE_GPU };
  }
  return stored;
}

function labelQualityScore(label: string): number {
  let score = label.length;
  if (/iPhone\s+\d|iPhone SE|iPhone 1[0-6]/i.test(label)) score += 120;
  if (/\b(POCO|Redmi|Xiaomi|Galaxy|Samsung Galaxy|Pixel|Honor|realme|OnePlus)\b/i.test(label)) {
    score += 100;
  }
  if (/экран\s+\d+/i.test(label)) score += 30;
  if (/\|/.test(label)) score += 15;
  if (/^iPhone\s*[·|]\s*Safari\s*[·|]\s*macOS\s*$/i.test(label.trim())) score -= 80;
  if (/^iPhone\s*[·|]\s*Safari/i.test(label) && !/экран/i.test(label)) score -= 40;
  return score;
}

function pickBetterDeviceLabel(a: string, b: string): string {
  return labelQualityScore(a) >= labelQualityScore(b) ? a : b;
}

export function isLegacyDeviceLabel(label: string): boolean {
  const t = label.trim();
  if (!t) return true;
  if (/^iPhone\s*[·|]\s*Safari\s*[·|]\s*macOS\s*$/i.test(t)) return true;
  if (/^iPhone\s*[·|]\s*Safari/i.test(t) && !/экран\s+\d+/i.test(t)) return true;
  return false;
}

function screenExtrasFromRow(row: {
  screen_w?: number | null;
  screen_h?: number | null;
  screen_dpr?: number | null;
}): DeviceLabelExtras | undefined {
  if (!row.screen_w || !row.screen_h) return undefined;
  return {
    screenW: row.screen_w,
    screenH: row.screen_h,
    devicePixelRatio: row.screen_dpr ?? undefined,
  };
}

function mergeScreenExtras(
  req: Request,
  deviceId?: string
): DeviceLabelExtras | undefined {
  const fromReq = readScreenExtrasFromRequest(req);
  if (fromReq) return fromReq;
  if (!deviceId) return undefined;
  const row = db
    .prepare(
      `SELECT screen_w, screen_h, screen_dpr FROM portal_devices WHERE id = ?`
    )
    .get(deviceId) as
    | { screen_w: number | null; screen_h: number | null; screen_dpr: number | null }
    | undefined;
  return row ? screenExtrasFromRow(row) : undefined;
}

export function resolveBestDeviceLabel(
  storedLabel: string,
  userAgent: string,
  extras?: DeviceLabelExtras
): string {
  const rebuilt = formatDeviceLabel(userAgent, extras);
  if (isLegacyDeviceLabel(storedLabel)) return rebuilt;
  return pickBetterDeviceLabel(storedLabel, rebuilt);
}

export function readDeviceLabelFromRequest(
  req: Request,
  userAgent: string,
  deviceId?: string
): string {
  const extras = mergeScreenExtras(req, deviceId);
  const rebuilt = formatDeviceLabel(userAgent, extras);
  const session = parseClientSessionContext(req);
  const clean = session.label?.replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 400);
  if (clean && clean.length >= 2 && !isLegacyDeviceLabel(clean)) {
    return pickBetterDeviceLabel(clean, rebuilt);
  }
  return rebuilt;
}

function readHeaderDecoded(req: Request, key: string, maxLen: number): string | null {
  const raw = req.headers[key];
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return decodeURIComponent(raw.trim())
      .replace(/[\x00-\x1f\x7f]/g, "")
      .trim()
      .slice(0, maxLen);
  } catch {
    return raw.trim().replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, maxLen);
  }
}

function resolveModelFromRequest(
  req: Request,
  userAgent: string,
  deviceId?: string
): ResolvedDeviceModel | null {
  const extras = mergeScreenExtras(req, deviceId);
  const session = parseClientSessionContext(req);
  const hintModel = session.hintModel ?? undefined;
  const clientModel = session.model ?? undefined;
  const clientConfidence = session.modelConfidence;
  const clientSource = session.modelSource ?? undefined;

  const incoming = resolveDeviceModelBest({
    ua: userAgent,
    extras,
    hintModel,
    clientModel,
    clientConfidence: clientConfidence,
    clientSource,
  });

  if (!deviceId) return incoming;

  const stored = db
    .prepare(
      `SELECT marketing_model, model_confidence FROM portal_devices WHERE id = ?`
    )
    .get(deviceId) as
    | { marketing_model: string; model_confidence: number }
    | undefined;

  return pickBetterStoredModel(
    stored?.marketing_model
      ? normalizeStoredAppleModel(
          {
            name: stored.marketing_model,
            confidence: stored.model_confidence ?? 0,
          },
          userAgent,
          extras
        )
      : null,
    incoming
  );
}

export function upsertPortalDevice(
  req: Request,
  deviceId: string,
  auth?: JwtPayload | null
): void {
  runWithSqliteRetry(() => upsertPortalDeviceInner(req, deviceId, auth));
}

function upsertPortalDeviceInner(
  req: Request,
  deviceId: string,
  auth?: JwtPayload | null
): void {
  const now = new Date().toISOString();
  const ua = String(req.headers["user-agent"] ?? "").slice(0, 500);
  const ip = clientIp(req).slice(0, 80);
  const extras = mergeScreenExtras(req, deviceId);
  let label = readDeviceLabelFromRequest(req, ua, deviceId);
  const resolvedModel = resolveModelFromRequest(req, ua, deviceId);
  const marketingModel = resolvedModel?.name ?? null;
  const modelConfidence = resolvedModel?.confidence ?? 0;
  const modelSource = resolvedModel?.source ?? "";
  if (marketingModel) {
    const parts = label.split("|").map((p) => p.trim());
    const first = parts[0] ?? "";
    if (
      isLegacyDeviceLabel(label) ||
      /^iPhone$/i.test(first) ||
      /^iPad$/i.test(first) ||
      first !== marketingModel
    ) {
      const tail = parts.slice(1).filter(Boolean);
      label = [marketingModel, ...tail].join(" | ").slice(0, 400);
    }
  }
  const screenW = extras?.screenW ?? null;
  const screenH = extras?.screenH ?? null;
  const screenDpr = extras?.devicePixelRatio ?? null;
  const userId = auth?.sub ?? null;
  let userEmail: string | null = null;
  if (auth?.sub) {
    const row = db.prepare("SELECT profile_json FROM users WHERE id = ?").get(auth.sub) as
      | { profile_json: string }
      | undefined;
    if (row) {
      try {
        const profile = JSON.parse(row.profile_json) as { email?: string };
        userEmail = profile.email?.trim() || auth.emailNorm || null;
      } catch {
        userEmail = auth.emailNorm;
      }
    } else {
      userEmail = auth.emailNorm;
    }
  }

  db.prepare(
    `INSERT INTO portal_devices (
       id, label, user_agent, ip_last, user_id, user_email,
       first_seen_at, last_seen_at, banned, banned_at, banned_by,
       screen_w, screen_h, screen_dpr, marketing_model, model_confidence, model_source
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       user_agent = excluded.user_agent,
       ip_last = excluded.ip_last,
       last_seen_at = excluded.last_seen_at,
       user_id = COALESCE(excluded.user_id, portal_devices.user_id),
       user_email = COALESCE(excluded.user_email, portal_devices.user_email),
       screen_w = COALESCE(excluded.screen_w, portal_devices.screen_w),
       screen_h = COALESCE(excluded.screen_h, portal_devices.screen_h),
       screen_dpr = COALESCE(excluded.screen_dpr, portal_devices.screen_dpr),
       marketing_model = excluded.marketing_model,
       model_confidence = excluded.model_confidence,
       model_source = excluded.model_source`
  ).run(
    deviceId,
    label,
    ua,
    ip,
    userId,
    userEmail,
    now,
    now,
    screenW,
    screenH,
    screenDpr,
    marketingModel ?? "",
    modelConfidence,
    modelSource
  );
  recordDeviceVisit(deviceId, ip, userId, userEmail);
  scheduleDeviceGeoFromRequest(req, deviceId);
}

function recordDeviceVisit(
  deviceId: string,
  ip: string,
  userId: string | null,
  userEmail: string | null
): void {
  const now = new Date().toISOString();
  const last = db
    .prepare(
      `SELECT seen_at FROM portal_device_visits
       WHERE device_id = ? ORDER BY seen_at DESC LIMIT 1`
    )
    .get(deviceId) as { seen_at: string } | undefined;

  if (last) {
    const gap = Date.now() - new Date(last.seen_at).getTime();
    if (gap < VISIT_SESSION_GAP_MS) return;
  }

  db.prepare(
    `INSERT INTO portal_device_visits (id, device_id, seen_at, ip, user_id, user_email)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(randomUUID(), deviceId, now, ip, userId, userEmail);
}

export function listDeviceVisits(
  deviceId: string,
  limit = 80
): PortalDeviceVisitRow[] {
  const safeLimit = Math.min(Math.max(1, limit), 200);
  return db
    .prepare(
      `SELECT id, device_id, seen_at, ip, user_id, user_email
       FROM portal_device_visits
       WHERE device_id = ?
       ORDER BY seen_at DESC
       LIMIT ?`
    )
    .all(deviceId, safeLimit) as PortalDeviceVisitRow[];
}

export function countDeviceVisits(deviceId: string): number {
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM portal_device_visits WHERE device_id = ?")
    .get(deviceId) as { c: number };
  return row?.c ?? 0;
}

export function isPortalDeviceBanned(deviceId: string): boolean {
  const row = db
    .prepare("SELECT banned FROM portal_devices WHERE id = ?")
    .get(deviceId) as { banned: number } | undefined;
  return row?.banned === 1;
}

export type PortalDeviceRowWithStats = PortalDeviceRow & { visit_count: number };

const ADMIN_NOTE_MAX = 2000;

function normalizeAdminNote(raw: string): string {
  return raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "").trim().slice(0, ADMIN_NOTE_MAX);
}

/** Обновляет в БД устаревшие подписи, если уже сохранён размер экрана. */
export function refreshLegacyDeviceLabels(): void {
  const rows = db
    .prepare(
      `SELECT id, label, user_agent, screen_w, screen_h, screen_dpr, marketing_model, model_confidence
       FROM portal_devices`
    )
    .all() as PortalDeviceRow[];

  for (const row of rows) {
    const extras = screenExtrasFromRow(row);
    const resolved = resolveDeviceModelBest({
      ua: row.user_agent,
      extras,
    });
    if (!resolved?.name) continue;

    const wrongPoco =
      /POCO\s+F3/i.test(row.marketing_model ?? "") &&
      resolved.name === "POCO X3 Pro";
    const androidWithIphone =
      /Android/i.test(row.user_agent) &&
      (/iPhone|iPad/i.test(row.label) || /iPhone|iPad/i.test(row.marketing_model ?? ""));
    const falseIphone15Pro = Boolean(
      downgradeFalseIphone15Pro(
        row.marketing_model ?? "",
        row.user_agent,
        row.screen_w ?? undefined,
        row.screen_h ?? undefined
      )
    );
    const legacy = isLegacyDeviceLabel(row.label);

    const shouldUpgrade =
      wrongPoco ||
      androidWithIphone ||
      falseIphone15Pro ||
      legacy ||
      (resolved.confidence > (row.model_confidence ?? 0) &&
        resolved.name !== (row.marketing_model ?? "").trim());

    if (shouldUpgrade) {
      const corrected =
        downgradeFalseIphone15Pro(
          row.marketing_model ?? "",
          row.user_agent,
          row.screen_w ?? undefined,
          row.screen_h ?? undefined
        ) ?? resolved.name;
      const nextLabel = formatDeviceLabel(row.user_agent, extras);
      const parts = nextLabel.split("|").map((p) => p.trim());
      const label = [corrected, ...parts.slice(1)].filter(Boolean).join(" | ");
      db.prepare(
        `UPDATE portal_devices SET
           label = ?,
           marketing_model = ?,
           model_confidence = ?,
           model_source = ?
         WHERE id = ?`
      ).run(
        label.slice(0, 400),
        corrected,
        falseIphone15Pro ? MODEL_CONFIDENCE.IPHONE_SCREEN : resolved.confidence,
        falseIphone15Pro ? "iphone-screen-corrected" : resolved.source,
        row.id
      );
    }
  }
}

export function listPortalDevices(): PortalDeviceRowWithStats[] {
  return db
    .prepare(
      `SELECT d.id, d.label, d.user_agent, d.ip_last, d.user_id, d.user_email,
              d.first_seen_at, d.last_seen_at, d.banned, d.banned_at, d.banned_by,
              COALESCE(d.admin_note, '') AS admin_note,
              d.screen_w, d.screen_h, d.screen_dpr,
              COALESCE(d.marketing_model, '') AS marketing_model,
              COALESCE(d.model_confidence, 0) AS model_confidence,
              COALESCE(d.model_source, '') AS model_source,
              COALESCE(d.is_personal, 0) AS is_personal,
              d.geo_lat, d.geo_lng, d.geo_accuracy_m, d.geo_updated_at,
              (SELECT COUNT(*) FROM portal_device_visits v WHERE v.device_id = d.id) AS visit_count
       FROM portal_devices d
       ORDER BY d.last_seen_at DESC`
    )
    .all() as PortalDeviceRowWithStats[];
}

export function setPortalDeviceBanned(
  deviceId: string,
  banned: boolean,
  adminEmail: string
): { ok: true; affected: number } | { ok: false } {
  const row = db
    .prepare("SELECT user_email, user_id FROM portal_devices WHERE id = ?")
    .get(deviceId) as { user_email: string | null; user_id: string | null } | undefined;
  if (!row) return { ok: false };

  const now = new Date().toISOString();
  if (banned) {
    db.prepare(
      `UPDATE portal_devices SET banned = 1, banned_at = ?, banned_by = ? WHERE id = ?`
    ).run(now, adminEmail, deviceId);
    broadcastDeviceAccess([deviceId], true);
    return { ok: true, affected: 1 };
  }

  let targetIds: string[] = [deviceId];

  if (row.user_id) {
    targetIds = (
      db
        .prepare("SELECT id FROM portal_devices WHERE user_id = ?")
        .all(row.user_id) as { id: string }[]
    ).map((r) => r.id);
    db.prepare(
      `UPDATE portal_devices SET banned = 0, banned_at = NULL, banned_by = NULL WHERE user_id = ?`
    ).run(row.user_id);
    broadcastDeviceAccess(targetIds, false);
    return { ok: true, affected: targetIds.length };
  }

  const emailNorm = row.user_email?.trim().toLowerCase() ?? "";
  if (emailNorm) {
    targetIds = (
      db
        .prepare(
          `SELECT id FROM portal_devices WHERE user_email IS NOT NULL AND LOWER(TRIM(user_email)) = ?`
        )
        .all(emailNorm) as { id: string }[]
    ).map((r) => r.id);
    db.prepare(
      `UPDATE portal_devices SET banned = 0, banned_at = NULL, banned_by = NULL
       WHERE user_email IS NOT NULL AND LOWER(TRIM(user_email)) = ?`
    ).run(emailNorm);
    broadcastDeviceAccess(targetIds, false);
    return { ok: true, affected: targetIds.length };
  }

  db.prepare(
    `UPDATE portal_devices SET banned = 0, banned_at = NULL, banned_by = NULL WHERE id = ?`
  ).run(deviceId);
  broadcastDeviceAccess([deviceId], false);
  return { ok: true, affected: 1 };
}

export function setPortalDeviceAdminNote(
  deviceId: string,
  note: string
): { ok: true } | { ok: false } {
  const row = db.prepare("SELECT id FROM portal_devices WHERE id = ?").get(deviceId);
  if (!row) return { ok: false };
  db.prepare("UPDATE portal_devices SET admin_note = ? WHERE id = ?").run(
    normalizeAdminNote(note),
    deviceId
  );
  return { ok: true };
}

export function setPortalDevicePersonal(
  deviceId: string,
  personal: boolean
): { ok: true } | { ok: false } {
  const row = db.prepare("SELECT id FROM portal_devices WHERE id = ?").get(deviceId);
  if (!row) return { ok: false };
  db.prepare("UPDATE portal_devices SET is_personal = ? WHERE id = ?").run(
    personal ? 1 : 0,
    deviceId
  );
  return { ok: true };
}

export function deletePortalDevice(deviceId: string): { ok: true } | { ok: false } {
  const row = db.prepare("SELECT id FROM portal_devices WHERE id = ?").get(deviceId);
  if (!row) return { ok: false };
  db.prepare("DELETE FROM portal_device_visits WHERE device_id = ?").run(deviceId);
  db.prepare("DELETE FROM portal_devices WHERE id = ?").run(deviceId);
  return { ok: true };
}

export function visitRowToJson(row: PortalDeviceVisitRow) {
  return {
    id: row.id,
    deviceId: row.device_id,
    seenAt: row.seen_at,
    ip: row.ip,
    userId: row.user_id,
    userEmail: row.user_email,
  };
}

function readMarketingModelFromRequest(
  req: Request,
  userAgent: string,
  deviceId?: string
): string | null {
  return resolveModelFromRequest(req, userAgent, deviceId)?.name ?? null;
}

function labelWithModelHead(label: string, model: string, userAgent: string): string {
  const parts = label.split("|").map((p) => p.trim()).filter(Boolean);
  const tail = parts.slice(1);
  if (/Android/i.test(userAgent)) {
    const cleanTail = tail.filter((p) => !/^iPhone/i.test(p) && !/^iPad/i.test(p));
    return [model, ...cleanTail].join(" | ").slice(0, 400);
  }
  return [model, ...tail].join(" | ").slice(0, 400);
}

export function deviceRowToJson(row: PortalDeviceRowWithStats) {
  const extras = screenExtrasFromRow(row);
  const resolved = resolveDeviceModelBest({ ua: row.user_agent, extras });
  const displayModel =
    row.marketing_model?.trim() ||
    resolved?.name ||
    resolveDeviceModelName({ ua: row.user_agent, extras }) ||
    primaryModelFromLabel(row.label);
  const rawLabel = resolveBestDeviceLabel(row.label, row.user_agent, extras);
  const displayLabel = displayModel
    ? labelWithModelHead(rawLabel, displayModel, row.user_agent)
    : rawLabel;
  return {
    id: row.id,
    label: row.label,
    displayLabel,
    displayModel,
    userAgent: row.user_agent,
    ipLast: row.ip_last,
    userId: row.user_id,
    userEmail: row.user_email,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    banned: row.banned === 1,
    bannedAt: row.banned_at,
    bannedBy: row.banned_by,
    adminNote: row.admin_note ?? "",
    visitCount: row.visit_count ?? 0,
    personal: (row.is_personal ?? 0) === 1,
    geoLat: row.geo_lat ?? null,
    geoLng: row.geo_lng ?? null,
    geoAccuracyM: row.geo_accuracy_m ?? null,
    geoUpdatedAt: row.geo_updated_at ?? null,
  };
}

export function getPortalDeviceGeo(
  deviceId: string
): {
  lat: number;
  lng: number;
  accuracyM: number;
  updatedAt: string;
  source: "gps" | "ip";
} | null {
  const row = db
    .prepare(
      `SELECT geo_lat, geo_lng, geo_accuracy_m, geo_updated_at
       FROM portal_devices WHERE id = ?`
    )
    .get(deviceId) as PortalDeviceRow | undefined;
  if (
    !row ||
    row.geo_lat == null ||
    row.geo_lng == null ||
    !Number.isFinite(row.geo_lat) ||
    !Number.isFinite(row.geo_lng)
  ) {
    return null;
  }
  const accuracyM = row.geo_accuracy_m ?? 9999;
  return {
    lat: row.geo_lat,
    lng: row.geo_lng,
    accuracyM,
    updatedAt: row.geo_updated_at ?? "",
    source: "ip",
  };
}

export function newDeviceId(): string {
  return randomUUID();
}

function hasPortalDeviceConsent(deviceId: string): boolean {
  const row = db
    .prepare("SELECT consent_at FROM portal_devices WHERE id = ?")
    .get(deviceId) as { consent_at: string | null } | undefined;
  return Boolean(row?.consent_at?.trim());
}

export function recordPortalDeviceConsent(deviceId: string, policyVersion: string): void {
  runWithSqliteRetry(() => {
    const now = new Date().toISOString();
    const version = policyVersion.trim().slice(0, 64);
    db.prepare(
      `UPDATE portal_devices SET consent_at = ?, consent_policy_version = ? WHERE id = ?`
    ).run(now, version, deviceId);
  });
}

/** Атомарная регистрация устройства и согласия (массовые заходы). */
export function registerPortalDeviceWithConsent(
  req: Request,
  deviceId: string,
  auth: JwtPayload | null | undefined,
  policyVersion: string
): void {
  runWithSqliteRetry(() => {
    upsertPortalDeviceInner(req, deviceId, auth);
    const now = new Date().toISOString();
    const version = policyVersion.trim().slice(0, 64);
    db.prepare(
      `UPDATE portal_devices SET consent_at = ?, consent_policy_version = ? WHERE id = ?`
    ).run(now, version, deviceId);
  });
}

/** Регистрация клиентской сессии (cookie + upsert) — вызывается из /api/portal/version. */
export function touchPortalClientSession(
  req: Request,
  res: Response | null,
  auth?: JwtPayload | null
): string | null {
  const deviceId = readClientSessionId(req);
  if (!deviceId) return null;
  if (hasPortalDeviceConsent(deviceId)) {
    upsertPortalDevice(req, deviceId, auth);
  }
  if (res) attachPortalSessionCookie(res, deviceId, req);
  return deviceId;
}

export function portalGateHoldFlag(deviceId: string | null): 0 | 1 {
  if (!deviceId) return 0;
  return isPortalDeviceBanned(deviceId) ? 1 : 0;
}
