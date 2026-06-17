/**
 * Строго 5 цветов v2. Других HEX в дизайн-системе нет.
 * Прозрачность в CSS — rgba(43,100,253,α) и т.д. в tokens.css.
 */
export const V2_PALETTE = {
  primary: "#2B64FD",
  white: "#FFFFFF",
  ink: "#1C1C1C",
  surface: "#F6F6F6",
  muted: "#6B6B6B",
} as const;

export type V2PaletteColor = (typeof V2_PALETTE)[keyof typeof V2_PALETTE];

export const V2_RGB = {
  primary: "43, 100, 253",
  white: "255, 255, 255",
  ink: "28, 28, 28",
  surface: "246, 246, 246",
  muted: "107, 107, 107",
} as const;

/** @deprecated используйте V2_PALETTE — только 5 ключей */
export const V2_COLORS = { ...V2_PALETTE } as const;

export const V2_RADIUS = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 9999,
} as const;

export type V2PortalDesignId = "legacy" | "v2";

/** Семантика DS v2 (для TS/React inline — без новых HEX) */
export const V2_SEMANTIC = {
  pageBg: V2_PALETTE.white,
  fillSubtle: V2_PALETTE.surface,
  accent: V2_PALETTE.primary,
  text: V2_PALETTE.ink,
  textMuted: V2_PALETTE.muted,
} as const;

export const V2_GLASS = {
  l1: { blur: 36, saturate: 150 },
  l2: { blur: 22, saturate: 140 },
  l3: { blur: 8, saturate: 120 },
} as const;
