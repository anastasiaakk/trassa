import { BRAND } from "./cabinetPalettes";
import { V2_PALETTE, V2_RGB } from "../design-system/portal-v2/v2-tokens";

/** Локальные акценты форм/алертов в кабинете (legacy бордо/синий или v2 — 5 цветов макета). */
export type CabinetAccentTheme = {
  accent: string;
  accentSoft: string;
  accentBorder: string;
  navyBorder: string;
  inputBg: string;
  inputBorder: string;
  btnGhostBg: string;
  btnGhostText: string;
  btnGhostBorder: string;
  dismissBg: string;
  dismissText: string;
  okColor: string;
  hintsBg: string;
};

export function buildCabinetAccentTheme(isDark: boolean, v2: boolean): CabinetAccentTheme {
  if (!v2) {
    return {
      accent: isDark ? "#e8b4c4" : BRAND.burgundy,
      accentSoft: isDark ? "rgba(232, 180, 196, 0.14)" : "rgba(86, 6, 29, 0.08)",
      accentBorder: isDark ? "rgba(232, 180, 196, 0.38)" : "rgba(86, 6, 29, 0.28)",
      navyBorder: isDark ? "rgba(180, 198, 235, 0.22)" : "rgba(36, 59, 116, 0.22)",
      inputBg: isDark ? "rgba(12, 20, 42, 0.65)" : "rgba(255, 255, 255, 0.92)",
      inputBorder: isDark ? "rgba(180, 198, 235, 0.28)" : "rgba(36, 59, 116, 0.2)",
      btnGhostBg: isDark ? "rgba(36, 59, 116, 0.55)" : "rgba(255, 255, 255, 0.95)",
      btnGhostText: isDark ? "#f1f4fc" : BRAND.navyDeep,
      btnGhostBorder: isDark ? "rgba(180, 198, 235, 0.35)" : "rgba(36, 59, 116, 0.28)",
      dismissBg: isDark ? "rgba(86, 6, 29, 0.45)" : "rgba(86, 6, 29, 0.1)",
      dismissText: isDark ? "#fce8ee" : BRAND.burgundy,
      okColor: isDark ? "#9fd4c8" : "#1a6b58",
      hintsBg: isDark ? "rgba(36, 59, 116, 0.45)" : "rgba(36, 59, 116, 0.07)",
    };
  }

  const P = V2_PALETTE;
  const R = V2_RGB;
  return {
    accent: isDark ? P.white : P.ink,
    accentSoft: isDark ? `rgba(${R.primary}, 0.16)` : `rgba(${R.primary}, 0.1)`,
    accentBorder: isDark ? `rgba(${R.primary}, 0.38)` : `rgba(${R.primary}, 0.32)`,
    navyBorder: isDark ? `rgba(${R.white}, 0.22)` : `rgba(${R.ink}, 0.18)`,
    inputBg: isDark ? `rgba(${R.ink}, 0.72)` : `rgba(${R.white}, 0.92)`,
    inputBorder: isDark ? `rgba(${R.primary}, 0.28)` : `rgba(${R.primary}, 0.35)`,
    btnGhostBg: isDark ? `rgba(${R.ink}, 0.55)` : `rgba(${R.white}, 0.95)`,
    btnGhostText: isDark ? P.white : P.ink,
    btnGhostBorder: isDark ? `rgba(${R.primary}, 0.35)` : `rgba(${R.primary}, 0.35)`,
    dismissBg: isDark ? `rgba(${R.primary}, 0.22)` : `rgba(${R.primary}, 0.12)`,
    dismissText: isDark ? P.white : P.ink,
    okColor: P.primary,
    hintsBg: isDark ? `rgba(${R.ink}, 0.5)` : `rgba(${R.white}, 0.96)`,
  };
}
