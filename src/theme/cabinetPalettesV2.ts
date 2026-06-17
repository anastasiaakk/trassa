import type { CabinetChromeStyles } from "../components/CabinetChromeLayout";
import { V2_PALETTE, V2_RGB } from "../design-system/portal-v2/v2-tokens";

const C = V2_PALETTE;
const R = V2_RGB;

const GRAD = {
  brand: `linear-gradient(135deg, ${C.primary} 0%, ${C.white} 100%)`,
  pageDark: `radial-gradient(110% 90% at 8% -5%, rgba(${R.primary}, 0.24) 0%, transparent 48%),
    radial-gradient(95% 75% at 100% 15%, rgba(${R.white}, 0.18) 0%, transparent 46%),
    linear-gradient(165deg, ${C.ink} 0%, ${C.muted} 100%)`,
  pageLight: `radial-gradient(120% 80% at 90% -10%, rgba(${R.primary}, 0.2) 0%, transparent 50%),
    linear-gradient(180deg, ${C.white} 0%, ${C.white} 100%)`,
  glass: `linear-gradient(145deg, rgba(${R.white}, 0.96) 0%, rgba(${R.white}, 0.92) 100%)`,
  plaqueStripe: `linear-gradient(180deg, rgba(${R.primary}, 0.22) 0%, transparent 62%)`,
} as const;

function shadowCard(isDark: boolean): string {
  return isDark
    ? `0 20px 48px rgba(${R.ink}, 0.55), 0 0 32px rgba(${R.primary}, 0.08)`
    : `0 16px 40px rgba(${R.ink}, 0.12), 0 4px 16px rgba(${R.primary}, 0.15)`;
}

function insetGlass(isDark: boolean): string {
  return isDark
    ? `inset 0 1px 0 rgba(${R.white}, 0.18), inset 0 -1px 0 rgba(${R.ink}, 0.25)`
    : `inset 0 1px 0 rgba(${R.white}, 0.85), inset 0 -1px 0 rgba(${R.ink}, 0.06)`;
}

function paletteV2Dark(): CabinetChromeStyles {
  return {
    pageBg: GRAD.pageDark,
    text: C.white,
    muted: `rgba(${R.white}, 0.68)`,
    surfaceBg: `linear-gradient(145deg, rgba(${R.white}, 0.12) 0%, rgba(${R.primary}, 0.1) 100%)`,
    cardBg: `rgba(${R.white}, 0.1)`,
    sectionBg: `rgba(${R.white}, 0.08)`,
    inputBg: `rgba(${R.ink}, 0.72)`,
    buttonBg: GRAD.brand,
    buttonText: C.white,
    cardShadow: shadowCard(true),
    insetShadow: insetGlass(true),
    plaqueButtonBg: `linear-gradient(150deg, rgba(${R.white}, 0.14) 0%, rgba(${R.ink}, 0.45) 100%)`,
    plaqueButtonText: C.white,
    plaqueButtonMuted: `rgba(${R.white}, 0.6)`,
    plaqueButtonBorder: `1px solid rgba(${R.white}, 0.25)`,
    plaqueButtonShadow: `0 14px 32px rgba(${R.ink}, 0.4)`,
    plaqueAccentGlow: `0 0 0 1px rgba(${R.primary}, 0.24), 0 0 24px rgba(${R.primary}, 0.12)`,
    plaqueAccentStripe: GRAD.plaqueStripe,
    plaqueNavActiveBg: GRAD.brand,
    plaqueNavActiveText: C.white,
    plaqueNavActiveBorder: GRAD.brand,
    plaqueBadgeBg: `rgba(${R.primary}, 0.32)`,
    plaqueBadgeText: C.white,
    heroScrimFrom: `rgba(${R.ink}, 0.55)`,
    heroScrimTo: `rgba(${R.ink}, 0.82)`,
    headerProfileBg: `linear-gradient(135deg, ${C.ink} 0%, ${C.primary} 100%)`,
    panelBorder: `1px solid rgba(${R.white}, 0.2)`,
    tileBorder: `1px solid rgba(${R.white}, 0.14)`,
    progressTrack: `rgba(${R.ink}, 0.65)`,
    progressFill: GRAD.brand,
    surfaceHighlight: C.white,
    controlBorder: `1px solid rgba(${R.primary}, 0.38)`,
  };
}

function paletteV2Light(): CabinetChromeStyles {
  return {
    pageBg: GRAD.pageLight,
    text: C.ink,
    muted: C.muted,
    surfaceBg: GRAD.glass,
    cardBg: `rgba(${R.white}, 0.86)`,
    sectionBg: `rgba(${R.white}, 0.72)`,
    inputBg: C.white,
    buttonBg: GRAD.brand,
    buttonText: C.white,
    cardShadow: shadowCard(false),
    insetShadow: insetGlass(false),
    plaqueButtonBg: GRAD.glass,
    plaqueButtonText: C.ink,
    plaqueButtonMuted: C.muted,
    plaqueButtonBorder: `1px solid rgba(${R.primary}, 0.22)`,
    plaqueButtonShadow: `0 12px 28px rgba(${R.ink}, 0.1)`,
    plaqueAccentGlow: `0 0 0 1px rgba(${R.primary}, 0.2)`,
    plaqueAccentStripe: `linear-gradient(180deg, rgba(${R.white}, 0.92) 0%, rgba(${R.primary}, 0.16) 30%, transparent 65%)`,
    plaqueNavActiveBg: GRAD.brand,
    plaqueNavActiveText: C.white,
    plaqueNavActiveBorder: GRAD.brand,
    plaqueBadgeBg: `rgba(${R.primary}, 0.16)`,
    plaqueBadgeText: C.ink,
    heroScrimFrom: `rgba(${R.ink}, 0.3)`,
    heroScrimTo: `rgba(${R.ink}, 0.5)`,
    headerProfileBg: `linear-gradient(135deg, ${C.primary} 0%, ${C.white} 100%)`,
    panelBorder: `1px solid rgba(${R.primary}, 0.2)`,
    tileBorder: `1px solid rgba(${R.white}, 0.74)`,
    progressTrack: C.surface,
    progressFill: GRAD.brand,
    surfaceHighlight: C.white,
    controlBorder: `1px solid rgba(${R.primary}, 0.34)`,
  };
}

export function buildCabinetChromeThemeV2(_cabinetPath: string, isDark: boolean): CabinetChromeStyles {
  return isDark ? paletteV2Dark() : paletteV2Light();
}
