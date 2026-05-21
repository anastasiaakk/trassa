import type { CSSProperties } from "react";

/** Единые размеры круга с иконкой роли на герое (подрядчик, школа, СПО). */
export const HERO_ROLE_BTN_PX = 48;
export const HERO_ROLE_IMG_PX = 26;

export const heroTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  minHeight: HERO_ROLE_BTN_PX,
  flexWrap: "nowrap",
};

export function heroRoleButtonStyle(base: CSSProperties): CSSProperties {
  return {
    ...base,
    background: "#ffffff",
    border: "none",
    borderRadius: "50%",
    width: HERO_ROLE_BTN_PX,
    height: HERO_ROLE_BTN_PX,
    minWidth: HERO_ROLE_BTN_PX,
    minHeight: HERO_ROLE_BTN_PX,
    padding: 0,
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxSizing: "border-box",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.26)",
    cursor: "pointer",
  };
}

export function buildCabinetHeroCardStyle(
  heroCard: CSSProperties,
  imageUrl: string,
  isDark: boolean
): CSSProperties {
  const scrimFrom = isDark ? "15,23,42,0.58" : "46,69,108,0.45";
  const scrimTo = isDark ? "15,23,42,0.72" : "34,56,88,0.52";
  return {
    ...heroCard,
    backgroundImage:
      `linear-gradient(180deg, rgba(${scrimFrom}) 0%, rgba(${scrimTo}) 100%), url('${imageUrl}')`,
    backgroundSize: "cover",
    backgroundPosition: "center center",
    filter: "none",
  };
}
