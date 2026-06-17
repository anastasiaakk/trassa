import type { NextFunction, Request, Response } from "express";
import { readTokenFromRequest, verifyAccessToken } from "./auth.js";
import { readAdminTokenFromRequest, verifyAdminToken } from "./adminAuth.js";
import {
  DEVICE_BAN_CODE,
  DEVICE_BAN_MESSAGE,
  LEGACY_DEVICE_BAN_CODE,
  readDeviceIdFromRequest,
  upsertPortalDevice,
  isPortalDeviceBanned,
} from "../deviceAccess.js";

function pathOnly(req: Request): string {
  const u = req.originalUrl || req.url || "";
  return u.split("?")[0] || "";
}

function isExemptFromDeviceBan(req: Request): boolean {
  const path = pathOnly(req);
  if (path === "/api/health") return true;
  if (
    path === "/api/devices/status" ||
    path.startsWith("/api/devices/events") ||
    path === "/api/portal/ping" ||
    path.startsWith("/api/portal/live") ||
    path === "/api/portal/version" ||
    path === "/api/portal/state" ||
    path === "/api/portal/state-auth" ||
    path === "/api/portal/region" ||
    path === "/api/portal/consent"
  ) {
    return true;
  }
  if (path === "/api/admin/login") return true;
  const adminToken = readAdminTokenFromRequest(req);
  if (adminToken) {
    try {
      verifyAdminToken(adminToken);
      return true;
    } catch {
      /* not admin */
    }
  }
  return false;
}

function readAuthFromRequest(req: Request) {
  try {
    const t = readTokenFromRequest(req);
    if (!t) return null;
    return verifyAccessToken(t);
  } catch {
    return null;
  }
}

/** Регистрация устройства и блокировка доступа к API портала. */
export function portalDeviceAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isExemptFromDeviceBan(req)) {
    next();
    return;
  }

  const deviceId = readDeviceIdFromRequest(req);
  if (!deviceId) {
    next();
    return;
  }

  const auth = readAuthFromRequest(req);
  upsertPortalDevice(req, deviceId, auth);

  if (isPortalDeviceBanned(deviceId)) {
    res.status(403).json({
      ok: false,
      error: DEVICE_BAN_MESSAGE,
      code: DEVICE_BAN_CODE,
      legacyCode: LEGACY_DEVICE_BAN_CODE,
    });
    return;
  }

  next();
}
