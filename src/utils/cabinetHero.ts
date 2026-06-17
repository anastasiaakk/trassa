import type { CSSProperties } from "react";

/** Единые размеры круга с иконкой роли на герое (подрядчик, школа, СПО). */
export const HERO_ROLE_BTN_PX = 48;
export const HERO_ROLE_IMG_PX = 26;

/** Фиксированная высота плашки героя (не растягивать в dashboard-hero-grid). */
export const CABINET_HERO_PLAQUE_HEIGHT_PX = 404;

/** Только иллюстрация героя подрядчика (background-position, UI не трогаем). */
export const CABINET_HERO_BG_POSITION_CONTRACTOR = "center 28%";

export const heroTopRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  minHeight: HERO_ROLE_BTN_PX,
  flexWrap: "nowrap",
};

/** Плашка подписи на герое — только оформление, без клика. */
export function heroTagBadgeStyle(tagStyle: CSSProperties): CSSProperties {
  return {
    ...tagStyle,
    flexShrink: 1,
    minWidth: 0,
    cursor: "default",
    pointerEvents: "none",
    userSelect: "none",
  };
}

/** Белый круг с иконкой роли — только оформление, без клика. */
export function heroRoleIconBadgeStyle(base: CSSProperties): CSSProperties {
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
    cursor: "default",
    pointerEvents: "none",
    userSelect: "none",
  };
}

export function buildCabinetHeroCardStyle(
  heroCard: CSSProperties,
  imageUrl: string,
  isDark: boolean,
  backgroundPosition = "center center"
): CSSProperties {
  /** Равномерная серая подложка — без светлого градиента сверху */
  const scrimRgb = isDark ? "15,23,42" : "42,58,88";
  const scrimAlpha = isDark ? 0.58 : 0.46;
  const {
    background: _bg,
    backgroundImage: _bgi,
    backgroundSize: _bs,
    backgroundPosition: _bp,
    backgroundRepeat: _br,
    filter: _f,
    ...frame
  } = heroCard;
  const scrim = `linear-gradient(rgba(${scrimRgb},${scrimAlpha}), rgba(${scrimRgb},${scrimAlpha}))`;
  return {
    ...frame,
    minHeight: CABINET_HERO_PLAQUE_HEIGHT_PX,
    height: CABINET_HERO_PLAQUE_HEIGHT_PX,
    maxHeight: CABINET_HERO_PLAQUE_HEIGHT_PX,
    alignSelf: "start",
    boxSizing: "border-box",
    background: `${scrim}, url("${imageUrl}") ${backgroundPosition} / cover no-repeat`,
  };
}
