import type { NextFunction, Request, Response } from "express";
import {
  PORTAL_REGION_CODE,
  PORTAL_REGION_MESSAGE,
  checkRequestPortalRegion,
  isPortalRegionGateEnabled,
} from "../portalRegion.js";

function pathOnly(req: Request): string {
  const u = req.originalUrl || req.url || "";
  return u.split("?")[0] || "";
}

function isExemptFromRegionGate(req: Request): boolean {
  const path = pathOnly(req);
  if (path === "/api/health") return true;
  if (path === "/api/portal/region") return true;
  if (path.startsWith("/api/admin")) return true;
  return false;
}

/** Доступ к API портала только с территории России (по IP). */
export function portalRegionGateMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!isPortalRegionGateEnabled() || isExemptFromRegionGate(req)) {
    next();
    return;
  }

  void checkRequestPortalRegion(req)
    .then((check) => {
      if (check.allowed) {
        next();
        return;
      }
      res.status(403).json({
        ok: false,
        error: PORTAL_REGION_MESSAGE,
        code: PORTAL_REGION_CODE,
        countryCode: check.countryCode,
        countryName: check.countryName,
      });
    })
    .catch(next);
}
