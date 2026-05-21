import { publicUrl } from "../utils/publicUrl";

/**
 * Локальные копии ассетов из `фреймы/Радор/public` и page3-refs.
 * id в имени — как в старых URL TagJS (KMgTjwx8lt/{id}_expires_30_days.png).
 */
export const APP_LOGO_SRC = publicUrl("tagjs/k21ztar3.png");
export const PAGE2_HEADER_LOGO_SRC = publicUrl("tagjs/lt3gp5do.png");

export const ICON_SEARCH = publicUrl("tagjs/w5oazpzp.svg");
/** Переключатель темы (солнце/луна) */
export const ICON_THEME = publicUrl("tagjs/uz9yxbza.svg");
/** Аватар в плашке профиля */
export const ICON_AVATAR = publicUrl("tagjs/u4te4tx0.svg");
/** Стрелка у имени (профиль) */
export const ICON_PROFILE_CHEVRON = publicUrl("tagjs/ac7lp2lp.svg");
/** Выход / смена роли */
export const ICON_LOGOUT = publicUrl("tagjs/ujfy3mdv.svg");
export const ICON_HERO_HOME = publicUrl("tagjs/of5s9282.svg");

export const CABINET_HERO_BG = publicUrl("tagjs/nbc1yabw.png");

/** Иконки Page3 */
export const ROLE_ICON_SCHOOL = publicUrl("tagjs/b3pnceya.png");
export const ROLE_ICON_STUDENT = publicUrl("tagjs/66h5rmum.png");
export const ROLE_ICON_CONTRACTOR = publicUrl("tagjs/0tenwd9b.png");

export const ROLE_ICON_INSTITUTION = publicUrl("tagjs/boty0uwi.png");

export const CABINET_CHROME_PRELOAD_IMAGES = [
  APP_LOGO_SRC,
  CABINET_HERO_BG,
  publicUrl("cabinet-hero-contractor.png"),
  ICON_SEARCH,
  ICON_THEME,
  ICON_AVATAR,
  ICON_PROFILE_CHEVRON,
  ICON_LOGOUT,
  ICON_HERO_HOME,
  publicUrl("tagjs/2fiff9mo.svg"),
] as const;
