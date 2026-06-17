import type { CabinetChromeStyles } from "../components/CabinetChromeLayout";

/** Фирменные опорные цвета */
export const BRAND = {
  burgundy: "#56061D",
  navyDeep: "#1A2A52",
  navy: "#243B74",
} as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function shadowCard(isDark: boolean, tint: string): string {
  if (isDark) {
    return `0 24px 54px rgba(2, 6, 18, 0.52), 0 2px 12px ${rgba(tint, 0.22)}`;
  }
  return `0 20px 42px ${rgba(BRAND.navyDeep, 0.16)}, 0 2px 10px rgba(255,255,255,0.92)`;
}

function insetNeo(isDark: boolean): string {
  if (isDark) {
    return "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.4)";
  }
  return "inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(26,42,82,0.1)";
}

type CabinetPaletteCore = {
  pageBg: string;
  text: string;
  muted: string;
  surfaceBg: string;
  cardBg: string;
  sectionBg: string;
  inputBg: string;
  plaqueButtonBg: string;
  plaqueButtonText: string;
  plaqueButtonMuted: string;
  plaqueButtonBorder: string;
  plaqueButtonShadow: string;
  plaqueNavActiveBg: string;
  plaqueNavActiveText: string;
  plaqueBadgeBg: string;
  plaqueBadgeText: string;
  heroScrimFrom: string;
  heroScrimTo: string;
  headerProfileBg: string;
  shadowTint?: string;
};

type CabinetPaletteExtras = Partial<{
  plaqueAccentGlow: string;
  plaqueAccentStripe: string;
  plaqueNavActiveBorder: string;
  panelBorder: string;
  tileBorder: string;
  progressTrack: string;
  progressFill: string;
  surfaceHighlight: string;
  controlBorder: string;
}>;

function baseChrome(isDark: boolean, o: CabinetPaletteCore & CabinetPaletteExtras): CabinetChromeStyles {
  const tint = o.shadowTint ?? BRAND.navyDeep;
  const panelBorder =
    o.panelBorder ??
    (isDark ? `1px solid ${rgba(BRAND.navy, 0.28)}` : `1px solid ${rgba(BRAND.navyDeep, 0.14)}`);
  const tileBorder =
    o.tileBorder ??
    (isDark ? "1px solid rgba(255,255,255,0.1)" : `1px solid ${rgba(BRAND.navyDeep, 0.08)}`);
  const progressTrack =
    o.progressTrack ?? (isDark ? "#141c2e" : rgba(BRAND.navy, 0.1));
  const progressFill =
    o.progressFill ?? `linear-gradient(90deg, ${BRAND.navyDeep} 0%, ${BRAND.navy} 100%)`;
  const surfaceHighlight =
    o.surfaceHighlight ?? (isDark ? "rgba(248, 250, 252, 0.97)" : "#ffffff");
  const controlBorder =
    o.controlBorder ??
    (isDark ? "1px solid rgba(255,255,255,0.14)" : `1px solid ${rgba(BRAND.navy, 0.26)}`);
  const plaqueAccentGlow =
    o.plaqueAccentGlow ??
    (isDark
      ? `0 0 0 1px ${rgba(BRAND.navyDeep, 0.2)}`
      : `0 0 0 1px ${rgba(BRAND.navy, 0.12)}`);
  const plaqueAccentStripe =
    o.plaqueAccentStripe ??
    (isDark
      ? `linear-gradient(90deg, ${rgba(BRAND.navyDeep, 0.2)} 0%, rgba(0,0,0,0) 16%)`
      : `linear-gradient(90deg, ${rgba(BRAND.navy, 0.1)} 0%, rgba(0,0,0,0) 14%)`);
  const plaqueNavActiveBorder =
    o.plaqueNavActiveBorder ??
    `linear-gradient(135deg, ${rgba(BRAND.navy, 0.86)} 0%, ${rgba(BRAND.navyDeep, 0.78)} 100%)`;

  return {
    pageBg: o.pageBg,
    text: o.text,
    muted: o.muted,
    surfaceBg: o.surfaceBg,
    cardBg: o.cardBg,
    sectionBg: o.sectionBg,
    inputBg: o.inputBg,
    buttonBg: BRAND.navy,
    buttonText: "#f8fafc",
    cardShadow: shadowCard(isDark, tint),
    insetShadow: insetNeo(isDark),
    plaqueButtonBg: o.plaqueButtonBg,
    plaqueButtonText: o.plaqueButtonText,
    plaqueButtonMuted: o.plaqueButtonMuted,
    plaqueButtonBorder: o.plaqueButtonBorder,
    plaqueButtonShadow: o.plaqueButtonShadow,
    plaqueAccentGlow,
    plaqueAccentStripe,
    plaqueNavActiveBg: o.plaqueNavActiveBg,
    plaqueNavActiveText: o.plaqueNavActiveText,
    plaqueNavActiveBorder,
    plaqueBadgeBg: o.plaqueBadgeBg,
    plaqueBadgeText: o.plaqueBadgeText,
    heroScrimFrom: o.heroScrimFrom,
    heroScrimTo: o.heroScrimTo,
    headerProfileBg: o.headerProfileBg,
    panelBorder,
    tileBorder,
    progressTrack,
    progressFill,
    surfaceHighlight,
    controlBorder,
  };
}

/** Школьный кабинет: тёплый фон, бордо + тёмно-синий в герое и плашках */
function paletteSchool(isDark: boolean): CabinetChromeStyles {
  if (isDark) {
    return baseChrome(true, {
      pageBg: `radial-gradient(130% 120% at 100% -10%, ${rgba(BRAND.navyDeep, 0.28)} 0%, rgba(0,0,0,0) 40%), radial-gradient(110% 100% at 0% 100%, rgba(66, 88, 142, 0.18) 0%, rgba(0,0,0,0) 42%), linear-gradient(165deg, #131219 0%, #1a1f2f 56%, #121724 100%)`,
      text: "#f4f7ff",
      muted: "#bec9df",
      surfaceBg: `linear-gradient(150deg, rgba(62, 66, 89, 0.64) 0%, rgba(43, 52, 82, 0.62) 45%, rgba(33, 45, 74, 0.66) 100%)`,
      cardBg: "rgba(36, 42, 66, 0.72)",
      sectionBg: "rgba(37, 45, 72, 0.7)",
      inputBg: "rgba(30, 39, 62, 0.74)",
      plaqueButtonBg: `linear-gradient(150deg, rgba(102, 108, 136, 0.5) 0%, rgba(82, 89, 120, 0.5) 42%, rgba(63, 74, 108, 0.56) 100%)`,
      plaqueButtonText: "#f3f7ff",
      plaqueButtonMuted: "#b8c3dd",
      plaqueButtonBorder: `1px solid rgba(255, 255, 255, 0.28)`,
      plaqueButtonShadow: `0 26px 44px rgba(2, 6, 18, 0.52), 0 10px 22px rgba(16, 22, 38, 0.48), 0 0 28px rgba(26, 42, 82, 0.22)`,
      plaqueAccentGlow: `0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 rgba(255,255,255,0.14)`,
      plaqueAccentStripe: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.04) 34%, rgba(0,0,0,0) 62%)`,
      plaqueNavActiveBg: `linear-gradient(145deg, #1a2a52 0%, #243b74 52%, #486ec0 100%)`,
      plaqueNavActiveText: "#f2f6ff",
      plaqueNavActiveBorder: `linear-gradient(135deg, ${rgba("#1a2a52", 0.9)} 0%, ${rgba(BRAND.navyDeep, 0.86)} 42%, ${rgba("#8db1ff", 0.86)} 100%)`,
      plaqueBadgeBg: "rgba(255,255,255,0.24)",
      plaqueBadgeText: "#fff6fa",
      heroScrimFrom: rgba(BRAND.navyDeep, 0.45),
      heroScrimTo: rgba(BRAND.navyDeep, 0.75),
      headerProfileBg: `linear-gradient(135deg, ${BRAND.navyDeep} 0%, ${BRAND.navy} 45%, #0f1830 100%)`,
      shadowTint: BRAND.navy,
      surfaceHighlight: "#f2f4fb",
      progressTrack: "rgba(31, 39, 61, 0.82)",
      progressFill: `linear-gradient(90deg, ${rgba(BRAND.navyDeep, 0.78)} 0%, ${rgba(BRAND.navy, 0.74)} 44%, #4f76bf 100%)`,
      panelBorder: `1px solid rgba(233, 221, 255, 0.3)`,
      tileBorder: `1px solid rgba(220, 232, 255, 0.26)`,
      controlBorder: `1px solid ${rgba(BRAND.navyDeep, 0.38)}`,
    });
  }
  return baseChrome(false, {
    pageBg: `radial-gradient(130% 120% at 100% -10%, ${rgba(BRAND.navyDeep, 0.18)} 0%, rgba(0,0,0,0) 42%), radial-gradient(130% 110% at 0% 100%, rgba(172, 194, 232, 0.2) 0%, rgba(0,0,0,0) 44%), linear-gradient(180deg, #edf2fb 0%, #eef2fa 58%, #e7edf8 100%)`,
    text: BRAND.navyDeep,
    muted: "#4f5a78",
    surfaceBg: `linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(245,248,255,0.62) 46%, rgba(241,245,253,0.66) 100%)`,
    cardBg: "rgba(255, 255, 255, 0.72)",
    sectionBg: `linear-gradient(175deg, rgba(255,255,255,0.76) 0%, rgba(241,246,255,0.68) 52%, rgba(238,245,254,0.72) 100%)`,
    inputBg: "rgba(244,247,253,0.82)",
    plaqueButtonBg: `linear-gradient(150deg, rgba(255,255,255,0.82) 0%, rgba(242,248,255,0.72) 42%, rgba(236,244,255,0.78) 100%)`,
    plaqueButtonText: "#152d5d",
    plaqueButtonMuted: "#5a6f95",
    plaqueButtonBorder: `1px solid rgba(255, 255, 255, 0.78)`,
    plaqueButtonShadow: `0 24px 36px rgba(26, 42, 82, 0.18), 0 10px 20px rgba(26, 42, 82, 0.12), 0 0 24px rgba(26, 42, 82, 0.2)`,
    plaqueAccentGlow: `0 0 0 1px rgba(255, 255, 255, 0.52), inset 0 1px 0 rgba(255,255,255,0.7)`,
    plaqueAccentStripe: `linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.28) 22%, rgba(255,255,255,0.08) 36%, rgba(0,0,0,0) 64%)`,
    plaqueNavActiveBg: `linear-gradient(145deg, #1a2a52 0%, #243b74 48%, #4d76c5 100%)`,
    plaqueNavActiveText: "#f7faff",
    plaqueNavActiveBorder: `linear-gradient(135deg, ${rgba("#1a2a52", 0.92)} 0%, ${rgba(BRAND.navyDeep, 0.72)} 44%, ${rgba("#8db0ff", 0.84)} 100%)`,
    plaqueBadgeBg: "rgba(255,255,255,0.5)",
    plaqueBadgeText: "#1a2a52",
    heroScrimFrom: rgba(BRAND.navyDeep, 0.38),
    heroScrimTo: rgba(BRAND.navy, 0.5),
    headerProfileBg: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyDeep} 42%, ${BRAND.navyDeep} 100%)`,
    shadowTint: BRAND.navy,
    progressTrack: "rgba(221, 230, 245, 0.86)",
    progressFill: `linear-gradient(90deg, ${rgba(BRAND.navyDeep, 0.84)} 0%, ${rgba(BRAND.navy, 0.72)} 42%, #4f76bf 100%)`,
    panelBorder: `1px solid rgba(255, 255, 255, 0.64)`,
    tileBorder: `1px solid rgba(255, 255, 255, 0.58)`,
    surfaceHighlight: "#ffffff",
    controlBorder: `1px solid ${rgba(BRAND.navy, 0.24)}`,
  });
}

/** СПО / ВО: холодный сине-серый, бордо как акцент в рамках и тенях */
function paletteSpo(isDark: boolean): CabinetChromeStyles {
  if (isDark) {
    return baseChrome(true, {
      pageBg: `linear-gradient(165deg, #0a0e1c 0%, #0f1628 50%, #0c1220 100%)`,
      text: "#eef2ff",
      muted: "#9aa8c8",
      surfaceBg: `linear-gradient(145deg, #141c30 0%, ${BRAND.navyDeep} 100%)`,
      cardBg: "#161f34",
      sectionBg: `linear-gradient(180deg, #182238 0%, #121a2c 100%)`,
      inputBg: "#141c2e",
      plaqueButtonBg: `linear-gradient(165deg, #243152 0%, ${BRAND.navyDeep} 55%, #151d32 100%)`,
      plaqueButtonText: "#e8edf8",
      plaqueButtonMuted: "#98a6c4",
      plaqueButtonBorder: `1px solid ${rgba(BRAND.navy, 0.35)}`,
      plaqueButtonShadow: `0 4px 18px rgba(0,0,0,0.32), inset 0 1px 0 ${rgba(BRAND.navy, 0.15)}`,
      plaqueNavActiveBg: `linear-gradient(165deg, ${BRAND.navy} 0%, #1d2a4a 100%)`,
      plaqueNavActiveText: "#f8fafc",
      plaqueBadgeBg: rgba(BRAND.burgundy, 0.28),
      plaqueBadgeText: "#fff5f8",
      heroScrimFrom: rgba(BRAND.navyDeep, 0.72),
      heroScrimTo: rgba(BRAND.navy, 0.68),
      headerProfileBg: `linear-gradient(135deg, ${BRAND.navyDeep} 0%, ${BRAND.navy} 55%, ${rgba(BRAND.burgundy, 0.85)} 100%)`,
    });
  }
  return baseChrome(false, {
    pageBg: `linear-gradient(180deg, #e8eef8 0%, #dfe8f4 100%)`,
    text: BRAND.navyDeep,
    muted: "#4d5d78",
    surfaceBg: "#f7f9fd",
    cardBg: "#fbfcff",
    sectionBg: `linear-gradient(180deg, #f2f6fc 0%, #e8eef6 100%)`,
    inputBg: "#e9f0fa",
    plaqueButtonBg: `linear-gradient(165deg, #d6e0f2 0%, #cad6eb 50%, #c0cee6 100%)`,
    plaqueButtonText: BRAND.navyDeep,
    plaqueButtonMuted: "#4f5f78",
    plaqueButtonBorder: `1px solid ${rgba(BRAND.navyDeep, 0.14)}`,
    plaqueButtonShadow: `0 4px 14px ${rgba(BRAND.navy, 0.12)}, inset 0 1px 0 rgba(255,255,255,0.8)`,
    plaqueNavActiveBg: `linear-gradient(165deg, #c8d6ec 0%, #b9cae4 100%)`,
    plaqueNavActiveText: BRAND.navyDeep,
    plaqueBadgeBg: rgba(BRAND.burgundy, 0.1),
    plaqueBadgeText: BRAND.navyDeep,
    heroScrimFrom: rgba(BRAND.navyDeep, 0.42),
    heroScrimTo: rgba(BRAND.navy, 0.5),
    headerProfileBg: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyDeep} 70%, ${rgba(BRAND.burgundy, 0.9)} 100%)`,
  });
}

/** Подрядчик: строгий баланс трёх цветов, глубокий синий + акцент бордо */
function paletteContractor(isDark: boolean): CabinetChromeStyles {
  if (isDark) {
    return baseChrome(true, {
      pageBg: `linear-gradient(165deg, #0b1020 0%, #10182c 45%, #0d1426 100%)`,
      text: "#f1f4fc",
      muted: "#a3b0d4",
      surfaceBg: `linear-gradient(145deg, #151d32 0%, ${BRAND.navyDeep} 100%)`,
      cardBg: "#171f35",
      sectionBg: `linear-gradient(180deg, #1a2238 0%, #131b2e 100%)`,
      inputBg: "#151c2e",
      plaqueButtonBg: `linear-gradient(165deg, #2a3350 0%, ${BRAND.navyDeep} 50%, #1a2136 100%)`,
      plaqueButtonText: "#e9eef9",
      plaqueButtonMuted: "#9aa8c6",
      plaqueButtonBorder: `1px solid ${rgba(BRAND.navy, 0.28)}`,
      plaqueButtonShadow: `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 ${rgba(BRAND.navy, 0.12)}`,
      plaqueNavActiveBg: `linear-gradient(165deg, ${BRAND.navy} 0%, #24365c 100%)`,
      plaqueNavActiveText: "#ffffff",
      plaqueBadgeBg: rgba(BRAND.burgundy, 0.32),
      plaqueBadgeText: "#fff5f7",
      heroScrimFrom: rgba(BRAND.navyDeep, 0.7),
      heroScrimTo: rgba(BRAND.navy, 0.65),
      headerProfileBg: `linear-gradient(135deg, ${BRAND.navyDeep} 0%, ${BRAND.navy} 50%, ${BRAND.burgundy} 100%)`,
    });
  }
  return baseChrome(false, {
    pageBg: `linear-gradient(180deg, #e6ebf5 0%, #dce4f2 100%)`,
    text: BRAND.navyDeep,
    muted: "#4a5872",
    surfaceBg: "#f8f9fc",
    cardBg: "#ffffff",
    sectionBg: `linear-gradient(180deg, #f0f4fb 0%, #e6edf7 100%)`,
    inputBg: "#e8eef8",
    plaqueButtonBg: `linear-gradient(165deg, #d0d9ea 0%, #c3cee3 50%, #b8c5dc 100%)`,
    plaqueButtonText: BRAND.navyDeep,
    plaqueButtonMuted: "#4d5c74",
    plaqueButtonBorder: `1px solid ${rgba(BRAND.navyDeep, 0.16)}`,
    plaqueButtonShadow: `0 4px 14px ${rgba(BRAND.navy, 0.14)}, inset 0 1px 0 rgba(255,255,255,0.75)`,
    plaqueNavActiveBg: `linear-gradient(165deg, #becde5 0%, #b3c4df 100%)`,
    plaqueNavActiveText: BRAND.navyDeep,
    plaqueBadgeBg: rgba(BRAND.burgundy, 0.12),
    plaqueBadgeText: BRAND.navyDeep,
    heroScrimFrom: rgba(BRAND.navyDeep, 0.48),
    heroScrimTo: rgba(BRAND.navy, 0.52),
    headerProfileBg: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyDeep} 35%, ${rgba(BRAND.burgundy, 0.92)} 100%)`,
  });
}

export function buildCabinetChromeTheme(cabinetPath: string, isDark: boolean): CabinetChromeStyles {
  if (cabinetPath === "/cabinet-school") return paletteSchool(isDark);
  if (cabinetPath === "/cabinet-spo") return paletteSpo(isDark);
  if (cabinetPath === "/page4") return paletteContractor(isDark);
  if (cabinetPath === "/page5" || cabinetPath === "/page6") return paletteSpo(isDark);
  return paletteSchool(isDark);
}

/** Кабинет ассоциации (РАДОР / АДО) — отдельная страница, своя гамма на базе тех же цветов */
export function buildAssociationPageTheme(variant: "rador" | "ado", isDark: boolean): CabinetChromeStyles {
  return paletteSchool(isDark);
}
