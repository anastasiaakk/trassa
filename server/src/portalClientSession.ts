import type { Request, Response } from "express";
import type { JwtPayload } from "./middleware/auth.js";

/** См. src/utils/portalClientSession.ts */
export const SESSION_COOKIE_NAME = "pv2_s";
export const SESSION_BUNDLE_QUERY = "k";

export const CLIENT_SESSION_ID_HEADER = "x-pv2-csid";
export const CLIENT_SESSION_CTX_HEADER = "x-pv2-ctx";

export const LEGACY_DEVICE_ID_HEADER = "x-trassa-device-id";
export const LEGACY_DEVICE_LABEL_HEADER = "x-trassa-device-label";
export const LEGACY_DEVICE_SCREEN_W_HEADER = "x-trassa-screen-w";
export const LEGACY_DEVICE_SCREEN_H_HEADER = "x-trassa-screen-h";
export const LEGACY_DEVICE_DPR_HEADER = "x-trassa-dpr";
export const LEGACY_DEVICE_GPU_RENDERER_HEADER = "x-trassa-gpu-renderer";
export const LEGACY_DEVICE_IOS_MAJOR_HEADER = "x-trassa-ios-major";
export const LEGACY_DEVICE_MODEL_HEADER = "x-trassa-device-model";
export const LEGACY_DEVICE_MODEL_CONFIDENCE_HEADER = "x-trassa-model-confidence";
export const LEGACY_DEVICE_MODEL_SOURCE_HEADER = "x-trassa-model-source";
export const LEGACY_DEVICE_HINT_MODEL_HEADER = "x-trassa-hint-model";
export const LEGACY_DEVICE_GEO_LAT_HEADER = "x-trassa-geo-lat";
export const LEGACY_DEVICE_GEO_LNG_HEADER = "x-trassa-geo-lng";
export const LEGACY_DEVICE_GEO_ACCURACY_HEADER = "x-trassa-geo-accuracy";

export const GATE_HOLD_CODE = "GATE_HOLD";

const SESSION_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

export type ParsedClientSessionContext = {
  label?: string;
  model?: string;
  modelConfidence?: number;
  modelSource?: string;
  hintModel?: string;
  screenW?: number;
  screenH?: number;
  devicePixelRatio?: number;
  gpuRenderer?: string;
  iosMajor?: number;
  geo?: { lat: number; lng: number; accuracyM: number };
};

type RawCtx = {
  l?: string;
  m?: string;
  mc?: number;
  ms?: string;
  hm?: string;
  sw?: number;
  sh?: number;
  dpr?: number;
  gpu?: string;
  ios?: number;
  lat?: number;
  lng?: number;
  acc?: number;
};

type SessionBundle = { s?: string; c?: string };

function header(req: Request, ...names: string[]): string | undefined {
  for (const name of names) {
    const v = req.headers[name];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizeSessionId(raw: string): string | null {
  const id = raw.trim();
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(id)) return null;
  return id;
}

function decodeBase64Url(raw: string): string | null {
  try {
    const norm = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = norm.length % 4 === 0 ? "" : "=".repeat(4 - (norm.length % 4));
    return Buffer.from(norm + pad, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function decodeCtxBlob(raw: string): RawCtx | null {
  const json = decodeBase64Url(raw);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as RawCtx;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readSessionBundle(req: Request): SessionBundle | null {
  const q = req.query[SESSION_BUNDLE_QUERY];
  let raw = "";
  if (typeof q === "string") raw = q;
  else if (Array.isArray(q) && typeof q[0] === "string") raw = q[0];
  if (!raw.trim()) return null;
  const json = decodeBase64Url(raw.trim());
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as SessionBundle;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readSessionIdFromCookie(req: Request): string | null {
  const raw = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof raw !== "string") return null;
  return normalizeSessionId(raw);
}

function decodeURIComponentSafe(raw: string, maxLen: number): string | null {
  try {
    return decodeURIComponent(raw).slice(0, maxLen);
  } catch {
    return raw.slice(0, maxLen);
  }
}

function num(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function rawCtxFromSources(
  ctx: RawCtx | null,
  req: Request
): RawCtx | null {
  if (ctx) return ctx;
  const blob = header(req, CLIENT_SESSION_CTX_HEADER);
  return blob ? decodeCtxBlob(blob) : null;
}

export function readClientSessionId(req: Request): string | null {
  const fromCookie = readSessionIdFromCookie(req);
  if (fromCookie) return fromCookie;

  const bundle = readSessionBundle(req);
  if (bundle?.s) {
    const id = normalizeSessionId(bundle.s);
    if (id) return id;
  }

  const fromHeader = header(req, CLIENT_SESSION_ID_HEADER, LEGACY_DEVICE_ID_HEADER);
  if (fromHeader) {
    const id = normalizeSessionId(fromHeader);
    if (id) return id;
  }

  const q = req.query.s ?? req.query.deviceId;
  const raw = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
  if (typeof raw === "string" && raw.trim()) {
    return normalizeSessionId(raw);
  }
  return null;
}

export function readClientSessionIdFromQuery(req: Request): string | null {
  return readClientSessionId(req);
}

export function parseClientSessionContext(req: Request): ParsedClientSessionContext {
  const out: ParsedClientSessionContext = {};
  const bundle = readSessionBundle(req);
  const innerCtx = bundle?.c ? decodeCtxBlob(bundle.c) : null;
  const ctx = rawCtxFromSources(innerCtx, req);

  const labelRaw = ctx?.l ?? header(req, LEGACY_DEVICE_LABEL_HEADER);
  if (labelRaw) out.label = decodeURIComponentSafe(labelRaw, 400) ?? undefined;

  const modelRaw = ctx?.m ?? header(req, LEGACY_DEVICE_MODEL_HEADER);
  if (modelRaw) out.model = decodeURIComponentSafe(modelRaw, 120) ?? undefined;

  const mc = ctx?.mc ?? num(header(req, LEGACY_DEVICE_MODEL_CONFIDENCE_HEADER));
  if (mc != null) out.modelConfidence = mc;

  const ms = ctx?.ms ?? header(req, LEGACY_DEVICE_MODEL_SOURCE_HEADER);
  if (ms) out.modelSource = decodeURIComponentSafe(ms, 40) ?? undefined;

  const hm = ctx?.hm ?? header(req, LEGACY_DEVICE_HINT_MODEL_HEADER);
  if (hm) out.hintModel = decodeURIComponentSafe(hm, 80) ?? undefined;

  const sw = ctx?.sw ?? num(header(req, LEGACY_DEVICE_SCREEN_W_HEADER));
  const sh = ctx?.sh ?? num(header(req, LEGACY_DEVICE_SCREEN_H_HEADER));
  if (sw != null) out.screenW = sw;
  if (sh != null) out.screenH = sh;

  const dpr = ctx?.dpr ?? num(header(req, LEGACY_DEVICE_DPR_HEADER));
  if (dpr != null) out.devicePixelRatio = dpr;

  const gpu = ctx?.gpu ?? header(req, LEGACY_DEVICE_GPU_RENDERER_HEADER);
  if (gpu) out.gpuRenderer = decodeURIComponentSafe(gpu, 120) ?? undefined;

  const ios = ctx?.ios ?? num(header(req, LEGACY_DEVICE_IOS_MAJOR_HEADER));
  if (ios != null) out.iosMajor = ios;

  const lat = ctx?.lat ?? num(header(req, LEGACY_DEVICE_GEO_LAT_HEADER));
  const lng = ctx?.lng ?? num(header(req, LEGACY_DEVICE_GEO_LNG_HEADER));
  const acc = ctx?.acc ?? num(header(req, LEGACY_DEVICE_GEO_ACCURACY_HEADER));
  if (
    lat != null &&
    lng != null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  ) {
    out.geo = {
      lat,
      lng,
      accuracyM: acc != null && acc > 0 ? Math.min(acc, 50_000) : 9999,
    };
  }

  return out;
}

export function attachPortalSessionCookie(res: Response, deviceId: string, req: Request): void {
  const secure =
    process.env.NODE_ENV === "production" ||
    req.secure ||
    req.headers["x-forwarded-proto"] === "https";
  res.cookie(SESSION_COOKIE_NAME, deviceId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function readAuthFromRequest(req: Request): JwtPayload | null {
  try {
    const { readTokenFromRequest, verifyAccessToken } = require("./middleware/auth.js") as {
      readTokenFromRequest: (r: Request) => string | null;
      verifyAccessToken: (t: string) => JwtPayload;
    };
    const t = readTokenFromRequest(req);
    if (!t) return null;
    return verifyAccessToken(t);
  } catch {
    return null;
  }
}
