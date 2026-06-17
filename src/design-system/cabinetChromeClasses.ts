/** CSS-классы v2 для разметки кабинета (пустые в legacy). */
export type CabinetChromeClassNames = {
  chrome: string;
  header: string;
  search: string;
  searchInput: string;
  adminBack: string;
  profileBar: string;
  msgrBtn: string;
  msgrActive: string;
  msgrUnread: string;
  messenger: string;
  main: string;
  aside: string;
  sideCard: string;
  infoCard: string;
  recentPanel: string;
  recentTitle: string;
  hero: string;
  navActive: string;
  section: string;
};

const EMPTY: CabinetChromeClassNames = {
  chrome: "",
  header: "",
  search: "",
  searchInput: "",
  adminBack: "",
  profileBar: "",
  msgrBtn: "",
  msgrActive: "",
  msgrUnread: "",
  messenger: "",
  main: "",
  aside: "",
  sideCard: "",
  infoCard: "",
  recentPanel: "",
  recentTitle: "",
  hero: "",
  navActive: "",
  section: "",
};

export function buildCabinetChromeClassNames(v2: boolean): CabinetChromeClassNames {
  if (!v2) return EMPTY;
  return {
    chrome: "cabinet-chrome cabinet-chrome--v2",
    header: "cabinet-chrome__header",
    search: "cabinet-chrome__search",
    searchInput: "cabinet-chrome__search-input",
    adminBack: "cabinet-chrome__admin-back",
    profileBar: "cabinet-chrome__profile-bar",
    msgrBtn: "cabinet-chrome__msgr-btn",
    msgrActive: "cabinet-chrome__msgr-active",
    msgrUnread: "cabinet-chrome__msgr-unread",
    messenger: "cabinet-chrome__messenger",
    main: "cabinet-chrome__main",
    aside: "cabinet-chrome__aside cabinet-v2-aside",
    sideCard: "cabinet-chrome__side-card",
    infoCard: "cabinet-chrome__info-card",
    recentPanel: "cabinet-chrome__recent-panel",
    recentTitle: "cabinet-chrome__recent-title",
    hero: "cabinet-chrome__hero",
    navActive: "cabinet-chrome__nav-active",
    section: "cabinet-chrome__section",
  };
}

export function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Корневая сцена v2 (light-first по умолчанию). */
export function buildCabinetV2SceneClasses(isDark: boolean): string {
  return cx("pv2-scene", "cabinet-v2-scene", !isDark && "pv2-scene--light");
}

export const CABINET_V2_SHELL = {
  layout: "cabinet-v2-layout pv2-layout",
  body: "cabinet-v2-body pv2-main",
  topbar: "cabinet-v2-topbar pv2-topbar pv2-card-l1 pv2-accent-edge",
  stage: "cabinet-v2-dashboard-stage",
} as const;
