import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  DEVICE_BAN_MESSAGE,
  deviceRowToJson,
  listPortalDevices,
  refreshLegacyDeviceLabels,
  listDeviceVisits,
  visitRowToJson,
  readDeviceIdFromQuery,
  readDeviceIdFromRequest,
  setPortalDeviceBanned,
  setPortalDeviceAdminNote,
  setPortalDevicePersonal,
  deletePortalDevice,
  getPortalDeviceGeo,
  isPortalDeviceBanned,
  upsertPortalDevice,
  portalGateHoldFlag,
  touchPortalClientSession,
} from "../deviceAccess.js";
import { resolveIpGeoLocation } from "../deviceGeoIp.js";
import { subscribeDeviceAccess } from "../deviceAccessHub.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { readTokenFromRequest, verifyAccessToken } from "../middleware/auth.js";

function readAuthFromRequest(req: Request) {
  try {
    const t = readTokenFromRequest(req);
    if (!t) return null;
    return verifyAccessToken(t);
  } catch {
    return null;
  }
}

/** SSE: нейтральный канал синхронизации вкладки (без «device» в URL). */
export function handlePortalLiveStream(req: Request, res: Response): void {
  const deviceId = readDeviceIdFromQuery(req);
  if (!deviceId) {
    res.status(400).json({ ok: false, error: "Bad request." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const send = (held: boolean) => {
    res.write(`data: ${JSON.stringify({ ok: true, h: held ? 1 : 0 })}\n\n`);
    const flush = (res as Response & { flush?: () => void }).flush;
    if (typeof flush === "function") flush.call(res);
  };

  const auth = readAuthFromRequest(req);
  upsertPortalDevice(req, deviceId, auth);
  send(isPortalDeviceBanned(deviceId));

  const unsubscribe = subscribeDeviceAccess(deviceId, ({ banned }) => send(banned));
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 20_000);

  req.on("close", () => {
    unsubscribe();
    clearInterval(heartbeat);
  });
}

/** Лёгкий ping сессии портала (legacy). */
export function handlePortalPing(req: Request, res: Response): void {
  const deviceId = touchPortalClientSession(req, res, readAuthFromRequest(req));
  res.json({
    ok: true,
    v: 1,
    h: portalGateHoldFlag(deviceId),
    r: deviceId ? 1 : 0,
  });
}

export const devicesRouter = Router();

/** @deprecated legacy SSE — оставлен для совместимости прокси. */
devicesRouter.get("/events", handlePortalLiveStream);

/** @deprecated legacy status — оставлен для совместимости. */
devicesRouter.get("/status", (req: Request, res: Response) => {
  handlePortalPing(req, res);
});
export const adminDevicesRouter = Router();

adminDevicesRouter.get("/devices", requireAdmin, (_req: Request, res: Response) => {
  refreshLegacyDeviceLabels();
  const devices = listPortalDevices().map(deviceRowToJson);
  res.json({ ok: true, devices });
});

adminDevicesRouter.get("/devices/:id/location", requireAdmin, async (req: Request, res: Response) => {
  const deviceId = req.params.id?.trim();
  if (!deviceId) {
    res.status(400).json({ ok: false, error: "Не указано устройство." });
    return;
  }
  const exists = listPortalDevices().find((d) => d.id === deviceId);
  if (!exists) {
    res.status(404).json({ ok: false, error: "Устройство не найдено." });
    return;
  }

  const stored = getPortalDeviceGeo(deviceId);
  if (stored) {
    res.json({
      ok: true,
      location: {
        lat: stored.lat,
        lng: stored.lng,
        accuracyM: stored.accuracyM,
        updatedAt: stored.updatedAt || null,
        source: stored.source,
        ip: exists.ip_last,
      },
    });
    return;
  }

  const ip = exists.ip_last?.trim() || "";
  const ipGeo = await resolveIpGeoLocation(ip);
  if (ipGeo) {
    res.json({
      ok: true,
      location: {
        lat: ipGeo.lat,
        lng: ipGeo.lng,
        accuracyM: ipGeo.accuracyM,
        updatedAt: null,
        source: "ip",
        ip,
        placeLabel: [ipGeo.city, ipGeo.region].filter(Boolean).join(", ") || undefined,
      },
    });
    return;
  }

  res.json({
    ok: true,
    location: null,
    hint:
      "Координаты пока не определены. Попросите пользователя открыть портал с этого устройства — местоположение подставится автоматически по IP.",
  });
});

adminDevicesRouter.get("/devices/:id/visits", requireAdmin, (req: Request, res: Response) => {
  const deviceId = req.params.id?.trim();
  if (!deviceId) {
    res.status(400).json({ ok: false, error: "Не указано устройство." });
    return;
  }
  const exists = listPortalDevices().find((d) => d.id === deviceId);
  if (!exists) {
    res.status(404).json({ ok: false, error: "Устройство не найдено." });
    return;
  }
  const limitRaw = req.query.limit;
  const limit =
    typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : 80;
  const visits = listDeviceVisits(deviceId, Number.isFinite(limit) ? limit : 80).map(
    visitRowToJson
  );
  res.json({ ok: true, visits });
});

const patchSchema = z
  .object({
    banned: z.boolean().optional(),
    note: z.string().max(2000).optional(),
    personal: z.boolean().optional(),
  })
  .refine((d) => d.banned !== undefined || d.note !== undefined || d.personal !== undefined, {
    message: "Укажите banned, note или personal.",
  });

adminDevicesRouter.patch("/devices/:id", requireAdmin, (req: Request, res: Response) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const admin = (req as Request & { adminAuth: { emailNorm: string } }).adminAuth;
  const deviceId = req.params.id?.trim();
  if (!deviceId) {
    res.status(400).json({ ok: false, error: "Не указано устройство." });
    return;
  }

  let affected = 0;

  if (parsed.data.banned !== undefined) {
    const result = setPortalDeviceBanned(
      deviceId,
      parsed.data.banned,
      admin.emailNorm
    );
    if (!result.ok) {
      res.status(404).json({ ok: false, error: "Устройство не найдено." });
      return;
    }
    affected = result.affected;
  }

  if (parsed.data.note !== undefined) {
    const noteResult = setPortalDeviceAdminNote(deviceId, parsed.data.note);
    if (!noteResult.ok) {
      res.status(404).json({ ok: false, error: "Устройство не найдено." });
      return;
    }
  }

  if (parsed.data.personal !== undefined) {
    const personalResult = setPortalDevicePersonal(deviceId, parsed.data.personal);
    if (!personalResult.ok) {
      res.status(404).json({ ok: false, error: "Устройство не найдено." });
      return;
    }
  }

  res.json({ ok: true, affected });
});

adminDevicesRouter.delete("/devices/:id", requireAdmin, (req: Request, res: Response) => {
  const deviceId = req.params.id?.trim();
  if (!deviceId) {
    res.status(400).json({ ok: false, error: "Не указано устройство." });
    return;
  }
  const result = deletePortalDevice(deviceId);
  if (!result.ok) {
    res.status(404).json({ ok: false, error: "Устройство не найдено." });
    return;
  }
  res.json({ ok: true });
});
