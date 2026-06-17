import type { Request } from "express";
import { clientIp } from "./deviceAccess.js";
import { resolveIpCountry } from "./deviceGeoIp.js";

export const PORTAL_REGION_CODE = "REGION_BLOCKED";

/** Сообщение при доступе не из РФ. */
export const PORTAL_REGION_MESSAGE =
  "Данный портал доступен только на территории Российской Федерации.";

const RUSSIA_CODES = new Set(["RU"]);

export function isPortalRegionGateEnabled(): boolean {
  const v = (process.env.PORTAL_REGION_GATE ?? "").trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  if (process.env.NODE_ENV !== "production") return false;
  return true;
}

function isPrivateOrLocalIp(ip: string): boolean {
  const t = ip.trim();
  if (!t || t === "unknown") return true;
  if (t === "::1" || t === "127.0.0.1") return true;
  if (t.startsWith("10.") || t.startsWith("192.168.") || t.startsWith("172.")) return true;
  if (t.startsWith("fe80:") || t.startsWith("fc") || t.startsWith("fd")) return true;
  return false;
}

export function isRussiaCountryCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return RUSSIA_CODES.has(code.trim().toUpperCase());
}

export type PortalRegionCheck = {
  allowed: boolean;
  countryCode: string | null;
  countryName: string | null;
  ip: string;
  reason?: "russia" | "private" | "unknown" | "foreign" | "gate_off";
};

export async function checkIpPortalRegion(ip: string): Promise<PortalRegionCheck> {
  const trimmed = ip.trim().slice(0, 80) || "unknown";

  if (!isPortalRegionGateEnabled()) {
    return {
      allowed: true,
      countryCode: null,
      countryName: null,
      ip: trimmed,
      reason: "gate_off",
    };
  }

  if (isPrivateOrLocalIp(trimmed)) {
    return {
      allowed: true,
      countryCode: null,
      countryName: null,
      ip: trimmed,
      reason: "private",
    };
  }

  const country = await resolveIpCountry(trimmed);
  if (!country) {
    return {
      allowed: true,
      countryCode: null,
      countryName: null,
      ip: trimmed,
      reason: "unknown",
    };
  }

  if (isRussiaCountryCode(country.countryCode)) {
    return {
      allowed: true,
      countryCode: country.countryCode,
      countryName: country.countryName ?? null,
      ip: trimmed,
      reason: "russia",
    };
  }

  return {
    allowed: false,
    countryCode: country.countryCode,
    countryName: country.countryName ?? null,
    ip: trimmed,
    reason: "foreign",
  };
}

export async function checkRequestPortalRegion(req: Request): Promise<PortalRegionCheck> {
  return checkIpPortalRegion(clientIp(req));
}
