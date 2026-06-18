import {
  ROLE_ICON_CONTRACTOR,
  ROLE_ICON_INSTITUTION,
  ROLE_ICON_SCHOOL,
  ROLE_ICON_STUDENT,
} from "../assets/appIcons";

const firstCardPhoto = new URL("../assets/школьник.png", import.meta.url).href;
const secondCardPhoto = new URL("../assets/студент.png", import.meta.url).href;
const thirdCardPhoto = new URL("../assets/подрядчик.png", import.meta.url).href;
const fourthCardPhoto = new URL("../assets/админ.png", import.meta.url).href;
const fourthCardExpandedPhoto = new URL("../assets/admin-photo.png", import.meta.url).href;
const firstCardExpandedPhoto = new URL("../assets/page3-expanded-role1.png", import.meta.url).href;
const secondCardExpandedPhoto = new URL("../assets/page3-expanded-role2.png", import.meta.url).href;
const thirdCardExpandedPhoto = new URL("../assets/page3-expanded-role3.png", import.meta.url).href;
const firstCardIcon = ROLE_ICON_SCHOOL;

export const ROLE_HOVER_OVERLAY_SRC = [
  firstCardExpandedPhoto,
  secondCardExpandedPhoto,
  thirdCardExpandedPhoto,
  fourthCardExpandedPhoto,
] as const;

export const ROLE_EXPAND_BG = [
  { position: "center 42%", scale: "1.12" },
  { position: "center 42%", scale: "1.12" },
  { position: "center 42%", scale: "1.12" },
  { position: "center 42%", scale: "1.12" },
] as const;

export const ROLE_FEATURE_COPY = [
  {
    title: "Школьник",
    subtitle: "Строительство дорожного дела и помощь от родителей",
  },
  {
    title: "Студент",
    subtitle: "Республиканские олимпиады, своё портфолио и наставники",
  },
  {
    title: "Подрядчик",
    subtitle: "Поддержка в реализации и дорожные проекты",
  },
  {
    title: "Государственные институты",
    subtitle: "Мониторинг состояния и поддержка федеральных программ",
  },
] as const;

export function getLoginBadgeText(
  selectedRole: number | null,
  institutionProfile: "ado" | "rador"
): string {
  if (selectedRole === 3) {
    return institutionProfile === "rador" ? "Государственные институты" : "АДО";
  }
  if (selectedRole === 0) return "Школа";
  if (selectedRole === 1) return "СПО и ВО";
  if (selectedRole === 2) return "Подрядные организации";
  return "Государственные институты";
}

export const ROLE_SELECT_PRELOAD_IMAGES = [
  firstCardIcon,
  ROLE_ICON_STUDENT,
  ROLE_ICON_CONTRACTOR,
  ROLE_ICON_INSTITUTION,
  firstCardPhoto,
  secondCardPhoto,
  thirdCardPhoto,
  firstCardExpandedPhoto,
  secondCardExpandedPhoto,
  thirdCardExpandedPhoto,
  fourthCardPhoto,
  fourthCardExpandedPhoto,
] as const;

export const ROLE_SELECT_ROLE_ICONS = [
  {
    iconSrc: firstCardIcon,
    overlay: true,
    overlaySrc: firstCardPhoto,
    alt: "Роль 1",
  },
  {
    iconSrc: ROLE_ICON_STUDENT,
    overlay: true,
    overlaySrc: secondCardPhoto,
    alt: "Роль 2",
  },
  {
    iconSrc: ROLE_ICON_CONTRACTOR,
    overlay: true,
    overlaySrc: thirdCardPhoto,
    alt: "Роль 3",
  },
  {
    iconSrc: ROLE_ICON_INSTITUTION,
    overlay: true,
    overlaySrc: fourthCardPhoto,
    alt: "Роль 4",
  },
] as const;

export type RoleSelectRoleIcon = (typeof ROLE_SELECT_ROLE_ICONS)[number];
