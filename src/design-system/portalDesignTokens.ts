/**
 * Редактируемая дизайн-система v2 — токены в KV + inline CSS на :root.
 * Палитра: 5 HEX из PORTAL-DESIGN-V2-DS.md.
 */

export const PORTAL_DESIGN_TOKENS_CHANGED = "trassa-portal-design-tokens-changed";

const STORAGE_KEY = "trassa-portal-design-tokens-v1";

export type PortalDesignTokensV1 = {
  version: 1;
  palette: {
    primary: string;
    white: string;
    ink: string;
    surface: string;
    muted: string;
  };
  radius?: {
    sm?: string;
    md?: string;
    lg?: string;
  };
  blur?: {
    md?: string;
  };
  /** Доп. переменные только из белого списка */
  cssVars?: Record<string, string>;
};

export const DEFAULT_PORTAL_DESIGN_TOKENS: PortalDesignTokensV1 = {
  version: 1,
  palette: {
    primary: "#2B64FD",
    white: "#FFFFFF",
    ink: "#1C1C1C",
    surface: "#F6F6F6",
    muted: "#6B6B6B",
  },
  radius: { sm: "14px", md: "18px", lg: "24px" },
  blur: { md: "22px" },
};

/** CSS-переменные, которые можно менять из админки / ИИ */
export const EDITABLE_DESIGN_CSS_VARS = [
  "--pv2-primary",
  "--pv2-white",
  "--pv2-ink",
  "--pv2-surface",
  "--pv2-muted",
  "--pv2-r-primary",
  "--pv2-r-white",
  "--pv2-r-ink",
  "--pv2-r-surface",
  "--pv2-r-muted",
  "--pv2-radius-xs",
  "--pv2-radius-sm",
  "--pv2-radius-md",
  "--pv2-radius-lg",
  "--pv2-radius-xl",
  "--pv2-blur-md",
  "--pv2-blur-lg",
  "--pv2-glass-saturate",
  "--pv2-font-kpi",
] as const;

const EDITABLE_SET = new Set<string>(EDITABLE_DESIGN_CSS_VARS);

function normalizeHex(hex: string): string {
  const t = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toUpperCase()}`;
  return t;
}

export function hexToRgbTriplet(hex: string): string | null {
  const n = normalizeHex(hex).replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(n)) return null;
  const v = parseInt(n, 16);
  return `${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}`;
}

export function parseDesignTokens(raw: unknown): PortalDesignTokensV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const palette = o.palette;
  if (!palette || typeof palette !== "object") return null;
  const p = palette as Record<string, unknown>;
  const keys = ["primary", "white", "ink", "surface", "muted"] as const;
  for (const k of keys) {
    if (typeof p[k] !== "string") return null;
  }
  const out: PortalDesignTokensV1 = {
    version: 1,
    palette: {
      primary: normalizeHex(String(p.primary)),
      white: normalizeHex(String(p.white)),
      ink: normalizeHex(String(p.ink)),
      surface: normalizeHex(String(p.surface)),
      muted: normalizeHex(String(p.muted)),
    },
  };
  if (o.radius && typeof o.radius === "object") {
    out.radius = o.radius as PortalDesignTokensV1["radius"];
  }
  if (o.blur && typeof o.blur === "object") {
    out.blur = o.blur as PortalDesignTokensV1["blur"];
  }
  if (o.cssVars && typeof o.cssVars === "object") {
    const cssVars: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.cssVars as Record<string, unknown>)) {
      if (EDITABLE_SET.has(k) && typeof v === "string") cssVars[k] = v;
    }
    if (Object.keys(cssVars).length) out.cssVars = cssVars;
  }
  return out;
}

export function tokensToCssVars(tokens: PortalDesignTokensV1): Record<string, string> {
  const { palette, radius, blur, cssVars } = tokens;
  const vars: Record<string, string> = {
    "--pv2-primary": palette.primary,
    "--pv2-white": palette.white,
    "--pv2-ink": palette.ink,
    "--pv2-surface": palette.surface,
    "--pv2-muted": palette.muted,
  };
  const rPrimary = hexToRgbTriplet(palette.primary);
  const rWhite = hexToRgbTriplet(palette.white);
  const rInk = hexToRgbTriplet(palette.ink);
  const rSurface = hexToRgbTriplet(palette.surface);
  const rMuted = hexToRgbTriplet(palette.muted);
  if (rPrimary) vars["--pv2-r-primary"] = rPrimary;
  if (rWhite) vars["--pv2-r-white"] = rWhite;
  if (rInk) vars["--pv2-r-ink"] = rInk;
  if (rSurface) vars["--pv2-r-surface"] = rSurface;
  if (rMuted) vars["--pv2-r-muted"] = rMuted;
  if (radius?.sm) vars["--pv2-radius-sm"] = radius.sm;
  if (radius?.md) vars["--pv2-radius-md"] = radius.md;
  if (radius?.lg) vars["--pv2-radius-lg"] = radius.lg;
  if (blur?.md) vars["--pv2-blur-md"] = blur.md;
  if (cssVars) {
    for (const [k, v] of Object.entries(cssVars)) {
      if (EDITABLE_SET.has(k)) vars[k] = v;
    }
  }
  return vars;
}

export function readStoredDesignTokens(): PortalDesignTokensV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseDesignTokens(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function getDesignTokens(): PortalDesignTokensV1 {
  return readStoredDesignTokens() ?? DEFAULT_PORTAL_DESIGN_TOKENS;
}

export function saveDesignTokensLocal(tokens: PortalDesignTokensV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    /* ignore */
  }
}

export function clearDesignTokenInlineStyles(): void {
  for (const key of EDITABLE_DESIGN_CSS_VARS) {
    document.documentElement.style.removeProperty(key);
  }
}

export function applyDesignTokens(tokens: PortalDesignTokensV1 = getDesignTokens()): void {
  if (document.documentElement.dataset.portalDesign !== "v2") {
    clearDesignTokenInlineStyles();
    return;
  }
  const vars = tokensToCssVars(tokens);
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }
}

export function setDesignTokens(tokens: PortalDesignTokensV1): void {
  saveDesignTokensLocal(tokens);
  applyDesignTokens(tokens);
  window.dispatchEvent(new Event(PORTAL_DESIGN_TOKENS_CHANGED));
}

export function resetDesignTokens(): PortalDesignTokensV1 {
  const defaults = DEFAULT_PORTAL_DESIGN_TOKENS;
  setDesignTokens(defaults);
  return defaults;
}

export function initPortalDesignTokens(): void {
  applyDesignTokens();
  if (typeof window !== "undefined") {
    window.addEventListener(PORTAL_DESIGN_TOKENS_CHANGED, () => applyDesignTokens());
  }
}

export function mergeDesignTokenPatch(
  base: PortalDesignTokensV1,
  patch: Partial<PortalDesignTokensV1> & { cssVars?: Record<string, string> },
): PortalDesignTokensV1 {
  return {
    version: 1,
    palette: { ...base.palette, ...patch.palette },
    radius: { ...base.radius, ...patch.radius },
    blur: { ...base.blur, ...patch.blur },
    cssVars: { ...base.cssVars, ...patch.cssVars },
  };
}

/** Извлечь JSON из ответа ИИ (чистый JSON или ```json блок). */
export function parseDesignAiPayload(
  text: string,
): { reply: string; patch?: Partial<PortalDesignTokensV1> & { cssVars?: Record<string, string> } } | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  try {
    const data = JSON.parse(jsonStr) as {
      reply?: string;
      patch?: Partial<PortalDesignTokensV1> & { cssVars?: Record<string, string> };
    };
    if (typeof data.reply !== "string") return null;
    return { reply: data.reply, patch: data.patch };
  } catch {
    return null;
  }
}
