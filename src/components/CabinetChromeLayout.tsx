import {
  ChangeEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import type { ProfileSettingsData } from "../profileSettingsStorage";
import {
  CABINET_THEME_CHANGED,
  loadCabinetTheme,
  loadProfileSettings,
  saveCabinetTheme,
} from "../profileSettingsStorage";
import { AiChatBubble } from "./AiChatBubble";
import CabinetQuickDock from "./CabinetQuickDock";
import CabinetSoftSidebar from "./CabinetSoftSidebar";
import CabinetSoftToolbar from "./CabinetSoftToolbar";
import CabinetV2SearchField from "./CabinetV2SearchField";
import {
  buildCabinetRailGroups,
  getCabinetSectionMeta,
  getCabinetTitle,
} from "../utils/cabinetRailItems";
import { buildCabinetDockItems, buildAssociationDockItems } from "../utils/cabinetDockItems";
import { useCabinetMobileNav } from "../hooks/useCabinetMobileNav";
import { getHoverTooltipPreset, HoverTooltip } from "./HoverTooltip";
import { CabinetMessengerView } from "../pages/CabinetMessengerView";
import {
  buildAssociationRailGroups,
  getAssociationSectionMeta,
} from "../utils/associationRailItems";
import { useAssociationRailBadges } from "../hooks/useAssociationRailBadges";
import { injectImagePreloads } from "../utils/imagePreload";
import {
  hasMessengerInboxUnread,
  markMessengerInboxSeen,
  readMessengerSeenAt,
} from "../utils/messengerUnread";
import { TBOT_NOTIFY_DOT_EVENT } from "../utils/messengerTbotNotify";
import {
  navigateToProfileSettings,
  rememberCabinetContext,
  restoreCabinetScrollPosition,
} from "../utils/profileNavigation";
import {
  applyMessengerInvitePayload,
  decodeMessengerInvite,
  MSGR_INVITE_PARAM,
} from "../utils/messengerInvite";
import {
  ADMIN_CABINET_SEARCH,
  clearAdminReturnMark,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import {
  clearCabinetBetaPreview,
  isCabinetBetaPreview,
} from "../utils/cabinetBetaPreview";
import {
  buildCabinetChromeClassNames,
  buildCabinetV2SceneClasses,
  CABINET_V2_SHELL,
  cx,
} from "../design-system/cabinetChromeClasses";
import { syncCabinetThemeDocument } from "../design-system/syncCabinetThemeDocument";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { buildCabinetChromeTheme } from "../theme/cabinetPalettes";
import { buildCabinetChromeThemeV2 } from "../theme/cabinetPalettesV2";
import { useContractorRailBadges } from "../hooks/useContractorRailBadges";
import {
  APP_LOGO_SRC,
  CABINET_CHROME_PRELOAD_IMAGES,
  CABINET_HERO_BG,
  ICON_AVATAR,
  ICON_LOGOUT,
  ICON_PROFILE_CHEVRON,
  ICON_SEARCH,
  ICON_THEME,
} from "../assets/appIcons";

export { CABINET_CHROME_PRELOAD_IMAGES };

export type CabinetSection = "dashboard" | "messenger" | "events";

function isAssociationCabinetPath(cabinetPath: string): boolean {
  return cabinetPath === "/page5" || cabinetPath === "/page6";
}

function leaveAssociationNestedRoute(
  cabinetPath: string,
  pathname: string,
  navigate: NavigateFunction
): void {
  const nested = [
    `${cabinetPath}/proforientation`,
    `${cabinetPath}/documents`,
    `${cabinetPath}/documents/incoming`,
    `${cabinetPath}/teams`,
  ];
  if (nested.includes(pathname)) {
    navigate(cabinetPath, { replace: true });
  }
}

export type CabinetChromeStyles = {
  pageBg: string;
  text: string;
  muted: string;
  surfaceBg: string;
  cardBg: string;
  sectionBg: string;
  inputBg: string;
  buttonBg: string;
  buttonText: string;
  cardShadow: string;
  insetShadow: string;
  /** Плашки-кнопки: приглушённые — светлая тема холодный серо-голубой; тёмная — приподнятый сланец */
  plaqueButtonBg: string;
  plaqueButtonText: string;
  plaqueButtonMuted: string;
  plaqueButtonBorder: string;
  plaqueButtonShadow: string;
  /** Акцентная подсветка/штрих для плашек-кнопок (контент, не хедер) */
  plaqueAccentGlow: string;
  plaqueAccentStripe: string;
  /** Выбранный пункт навигации в боковой колонке */
  plaqueNavActiveBg: string;
  plaqueNavActiveText: string;
  plaqueNavActiveBorder: string;
  /** Метка-счётчик на фоне плашки (напр. «Главная») */
  plaqueBadgeBg: string;
  plaqueBadgeText: string;
  /** Затемнение героя (два стопа linear-gradient) */
  heroScrimFrom: string;
  heroScrimTo: string;
  /** Градиент блока профиля в шапке */
  headerProfileBg: string;
  /** Рамка крупных панелей (контент, списки) */
  panelBorder: string;
  /** Рамка карточек / плиток в сетке */
  tileBorder: string;
  /** Фон дорожки прогресса */
  progressTrack: string;
  /** Заливка прогресса (цвет или gradient) */
  progressFill: string;
  /** Светлая вставка на тёмном фоне (активный блок и т.п.) */
  surfaceHighlight: string;
  /** Рамка кнопок вторичного уровня, полей */
  controlBorder: string;
};

export type CabinetChromeContext = {
  styles: CabinetChromeStyles;
  layoutStyles: Record<string, CSSProperties>;
  /** Классы glass v2 (пусто в legacy) */
  cn: ReturnType<typeof buildCabinetChromeClassNames>;
  isV2: boolean;
  isDark: boolean;
  profilePlaque: ProfileSettingsData;
  plaqueName: string;
  /** Поиск из шапки кабинета (v2 и legacy). */
  searchQuery: string;
  normalizedSearch: string;
  cabinetSection: CabinetSection;
  setCabinetSection: (section: CabinetSection) => void;
};

type Props = {
  cabinetPath: string;
  children: (ctx: CabinetChromeContext) => ReactNode;
  /** Вкладка «Мероприятия» для кабинетов РАДОР/АДО */
  renderEvents?: (ctx: CabinetChromeContext) => ReactNode;
  /** Подпись роли в боковом меню (по умолчанию — из cabinetPath) */
  sidebarRoleLabel?: string;
};

function CabinetChromeLayout({ cabinetPath, children, renderEvents, sidebarRoleLabel }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => loadCabinetTheme(cabinetPath));
  const [profilePlaque, setProfilePlaque] = useState(() => loadProfileSettings());
  const [cabinetSection, setCabinetSection] = useState<CabinetSection>("dashboard");
  const [messengerSeenAt, setMessengerSeenAt] = useState(() => readMessengerSeenAt());
  const [messengerHasUnread, setMessengerHasUnread] = useState(() =>
    typeof window !== "undefined" ? hasMessengerInboxUnread(readMessengerSeenAt()) : false
  );
  const [tbotNotifyDot, setTbotNotifyDot] = useState(false);
  const [messengerMountKey, setMessengerMountKey] = useState(0);
  const messengerEnabled = cabinetPath !== "/cabinet-school" && cabinetPath !== "/cabinet-spo";
  const isAssociationCabinet = isAssociationCabinetPath(cabinetPath);
  const associationRailBadges = useAssociationRailBadges();

  const isDark = theme === "dark";
  const portalDesign = usePortalDesign();
  const isV2 = portalDesign === "v2";
  const useMobileNav = useCabinetMobileNav();
  const contractorRailBadges = useContractorRailBadges(
    cabinetPath === "/page4" ? profilePlaque.email : ""
  );
  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const openEventsSection = useCallback(() => {
    if (!isAssociationCabinet) return;
    leaveAssociationNestedRoute(cabinetPath, location.pathname, navigate);
    setCabinetSection("events");
  }, [isAssociationCabinet, cabinetPath, location.pathname, navigate]);

  const dockItems = useMemo(() => {
    if (!isV2) return [];
    if (isAssociationCabinet) {
      return buildAssociationDockItems({
        basePath: cabinetPath,
        pathname: location.pathname,
        cabinetSection,
        messengerHasUnread,
        navigate,
        setCabinetSection,
        onOpenEvents: openEventsSection,
      });
    }
    return buildCabinetDockItems({
      cabinetPath,
      pathname: location.pathname,
      cabinetSection,
      messengerEnabled,
      messengerHasUnread,
      navigate,
      setCabinetSection,
      locationState: location.state,
    });
  }, [
    isV2,
    isAssociationCabinet,
    cabinetPath,
    location.pathname,
    location.state,
    cabinetSection,
    messengerEnabled,
    messengerHasUnread,
    navigate,
    openEventsSection,
  ]);

  const railBadgeOverrides = useMemo(() => {
    if (cabinetPath === "/page4") {
      return contractorRailBadges;
    }
    return undefined;
  }, [cabinetPath, contractorRailBadges]);

  const railGroups = useMemo(() => {
    if (!isV2) return [];
    if (isAssociationCabinet) {
      return buildAssociationRailGroups({
        basePath: cabinetPath,
        pathname: location.pathname,
        cabinetSection,
        navigate,
        setCabinetSection,
        onOpenEvents: openEventsSection,
        badgeOverrides: associationRailBadges,
      });
    }
    return buildCabinetRailGroups({
      cabinetPath,
      pathname: location.pathname,
      cabinetSection,
      messengerEnabled,
      navigate,
      setCabinetSection,
      badgeOverrides: railBadgeOverrides,
    });
  }, [
    isV2,
    isAssociationCabinet,
    cabinetPath,
    location.pathname,
    cabinetSection,
    messengerEnabled,
    navigate,
    openEventsSection,
    associationRailBadges,
    railBadgeOverrides,
  ]);

  const cabinetTitle = useMemo(() => getCabinetTitle(cabinetPath), [cabinetPath]);
  const cabinetRoleLabel = useMemo(() => {
    if (sidebarRoleLabel) return sidebarRoleLabel;
    switch (cabinetPath) {
      case "/cabinet-school":
        return "Школьник";
      case "/cabinet-spo":
        return "Студент";
      case "/page4":
        return "Подрядчик";
      case "/page5":
        return "РАДОР";
      case "/page6":
        return "АДО";
      default:
        return "Участник";
    }
  }, [cabinetPath, sidebarRoleLabel]);
  const cabinetMeta = useMemo(() => {
    if (isAssociationCabinet) {
      return getAssociationSectionMeta(location.pathname, cabinetPath, cabinetSection);
    }
    return getCabinetSectionMeta(location.pathname, cabinetPath, cabinetSection);
  }, [isAssociationCabinet, location.pathname, cabinetPath, cabinetSection]);
  /** Поиск в brand, toolbar отдельно — как у подрядчика (и студента на мобильном) */
  const isSearchFirstTopbar = cabinetPath === "/page4" || cabinetPath === "/cabinet-spo";

  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const cn = useMemo(() => buildCabinetChromeClassNames(isV2), [isV2]);

  const styles = useMemo(
    () => (isV2 ? buildCabinetChromeThemeV2(cabinetPath, isDark) : buildCabinetChromeTheme(cabinetPath, isDark)),
    [cabinetPath, isDark, isV2]
  );

  useEffect(() => {
    saveCabinetTheme(theme);
  }, [theme]);

  useEffect(() => {
    rememberCabinetContext(location.pathname || cabinetPath);
  }, [cabinetPath, location.pathname]);

  useEffect(() => {
    restoreCabinetScrollPosition();
  }, [location.pathname]);

  useEffect(() => {
    const syncTheme = () => {
      const next = loadCabinetTheme(cabinetPath);
      setTheme(next);
      syncCabinetThemeDocument(isV2 ? next : undefined);
    };
    window.addEventListener(CABINET_THEME_CHANGED, syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener(CABINET_THEME_CHANGED, syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, [isV2, cabinetPath]);

  useEffect(() => {
    const syncProfile = () => setProfilePlaque(loadProfileSettings());
    window.addEventListener("trassa-profile-saved", syncProfile);
    window.addEventListener("focus", syncProfile);
    return () => {
      window.removeEventListener("trassa-profile-saved", syncProfile);
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  useEffect(() => {
    return injectImagePreloads([...CABINET_CHROME_PRELOAD_IMAGES]);
  }, []);

  useEffect(() => {
    document.body.style.background = styles.pageBg;
    syncCabinetThemeDocument(isV2 ? theme : undefined);
  }, [styles.pageBg, isV2, theme]);

  const recalcMessengerBadge = useCallback(() => {
    if (!messengerEnabled) {
      setMessengerHasUnread(false);
      return;
    }
    if (cabinetSection === "messenger") {
      setMessengerHasUnread(false);
      return;
    }
    setMessengerHasUnread(hasMessengerInboxUnread(messengerSeenAt));
  }, [cabinetSection, messengerSeenAt, messengerEnabled]);

  useEffect(() => {
    recalcMessengerBadge();
  }, [recalcMessengerBadge]);

  useEffect(() => {
    const onTbotDot = (event: Event) => {
      const active = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
      setTbotNotifyDot(active);
    };
    window.addEventListener(TBOT_NOTIFY_DOT_EVENT, onTbotDot);
    return () => window.removeEventListener(TBOT_NOTIFY_DOT_EVENT, onTbotDot);
  }, []);

  useEffect(() => {
    if (!messengerEnabled) return;
    const onUpd = () => recalcMessengerBadge();
    window.addEventListener("trassa-messenger-updated", onUpd);
    return () => window.removeEventListener("trassa-messenger-updated", onUpd);
  }, [recalcMessengerBadge, messengerEnabled]);

  useEffect(() => {
    if (!messengerEnabled) return;
    if (cabinetSection !== "messenger") return;
    const t = Date.now();
    markMessengerInboxSeen(t);
    setMessengerSeenAt(t);
    setMessengerHasUnread(false);
  }, [cabinetSection, messengerEnabled]);

  useEffect(() => {
    if (!messengerEnabled) return;
    const sp = new URLSearchParams(location.search);
    const t = sp.get(MSGR_INVITE_PARAM);
    if (!t) return;
    const data = decodeMessengerInvite(t);
    if (!data) {
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    applyMessengerInvitePayload(data);
    if (isAssociationCabinet) {
      leaveAssociationNestedRoute(cabinetPath, location.pathname, navigate);
    }
    setCabinetSection("messenger");
    setMessengerMountKey((k) => k + 1);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate, messengerEnabled, isAssociationCabinet, cabinetPath]);

  useEffect(() => {
    if (messengerEnabled) return;
    if (cabinetSection === "messenger") {
      setCabinetSection("dashboard");
    }
  }, [messengerEnabled, cabinetSection]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleSetTheme = useCallback((next: "light" | "dark") => {
    setTheme(next);
  }, []);

  const handleToolbarMessenger = useCallback(() => {
    if (isAssociationCabinet) {
      leaveAssociationNestedRoute(cabinetPath, location.pathname, navigate);
    }
    setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"));
  }, [isAssociationCabinet, cabinetPath, location.pathname, navigate]);

  const handleToolbarNotifications = useCallback(() => {
    if (cabinetPath === "/cabinet-school") {
      navigate("/cabinet-school/messages");
    }
  }, [cabinetPath, navigate]);

  const goToProfile = useCallback(() => {
    navigateToProfileSettings(navigate, location.pathname);
  }, [navigate, location.pathname]);

  const goToRoleSelection = useCallback(() => {
    clearCabinetBetaPreview();
    clearAdminReturnMark();
    navigate("/page3");
  }, [navigate]);

  const betaPreviewActive = isCabinetBetaPreview();

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const plaqueName = profilePlaque.firstName.trim() || "Пользователь";

  const mainRegion = useMemo(
    () => ({
      flex: 1,
      minHeight: 0,
      width: "100%",
      display: "flex" as const,
      flexDirection: "column" as const,
      boxSizing: "border-box" as const,
    }),
    []
  );

  const layoutStyles = useMemo<Record<string, CSSProperties>>(
    () => ({
      root: {
        minHeight: "100vh",
        background: styles.pageBg,
        color: styles.text,
        fontFamily: "var(--font-ui)",
        padding: 24,
        transition: "background 0.35s ease, color 0.35s ease",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      },
      container: {
        maxWidth: 1400,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        flex: 1,
        minHeight: 0,
        width: "100%",
      },
      main: {
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: 30,
        alignItems: "start",
      },
      aside: {
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: 28,
        borderRadius: 34,
        background: styles.sectionBg,
        boxShadow: styles.cardShadow,
        backdropFilter: "blur(22px) saturate(120%)",
        WebkitBackdropFilter: "blur(22px) saturate(120%)",
        border: styles.panelBorder,
      },
      sideCard: {
        borderRadius: 30,
        background: styles.cardBg,
        padding: 24,
        boxShadow: styles.cardShadow,
        color: styles.text,
        border: styles.tileBorder,
        backdropFilter: "blur(20px) saturate(118%)",
        WebkitBackdropFilter: "blur(20px) saturate(118%)",
      },
      sideBlock: {
        width: "100%",
        borderRadius: 30,
        padding: "22px 20px",
        minHeight: 112,
        background: `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`,
        border: styles.plaqueButtonBorder,
        color: styles.plaqueButtonText,
        textAlign: "left",
        cursor: "pointer",
        boxShadow: `${styles.plaqueButtonShadow}, ${styles.plaqueAccentGlow}`,
        backdropFilter: "blur(24px) saturate(124%)",
        WebkitBackdropFilter: "blur(24px) saturate(124%)",
      },
      section: { display: "flex", flexDirection: "column", gap: 24, minWidth: 0 },
      heroCard: {
        borderRadius: 32,
        overflow: "hidden",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 28,
        backgroundImage:
          "linear-gradient(180deg, rgba(" +
          (isDark ? "15,23,42,0.65" : "46,69,108,0.55") +
          ") 0%, rgba(" +
          (isDark ? "15,23,42,0.65" : "34,56,88,0.55") +
          ") 100%), url('" +
          CABINET_HERO_BG +
          "')",
        backgroundSize: "115%",
        backgroundPosition: "center 40%",
        filter: "brightness(1.08)",
        boxShadow: styles.cardShadow,
        color: "#ffffff",
      },
      heroTag: {
        background: "rgba(255,255,255,0.16)",
        border: "1px solid rgba(255,255,255,0.24)",
        color: "#ffffff",
        borderRadius: 9999,
        padding: "10px 18px",
        cursor: "default",
      },
      heroButton: {
        background: "#ffffff",
        border: "none",
        borderRadius: "50%",
        padding: 0,
        cursor: "default",
      },
      heroTitle: {
        fontSize: 40,
        fontWeight: 700,
        lineHeight: 1.12,
        letterSpacing: "-0.03em",
        maxWidth: 520,
        color: "#ffffff",
      },
      heroTitleEmpty: {
        fontSize: 21,
        fontWeight: 500,
        lineHeight: 1.35,
        letterSpacing: "-0.01em",
        maxWidth: 480,
        color: "rgba(255,255,255,0.72)",
      },
      infoCard: {
        borderRadius: 30,
        padding: 26,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        color: styles.text,
        border: styles.tileBorder,
        backdropFilter: "blur(20px) saturate(115%)",
        WebkitBackdropFilter: "blur(20px) saturate(115%)",
      },
      infoLabel: {
        fontSize: 12,
        color: styles.muted,
        marginBottom: 8,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      },
      infoTitle: {
        fontSize: 28,
        fontWeight: 800,
        marginBottom: 10,
        letterSpacing: "-0.01em",
      },
      infoText: {
        fontSize: 14,
        color: styles.muted,
        lineHeight: 1.6,
      },
      actionCard: {
        width: "100%",
        borderRadius: 30,
        padding: "24px 22px",
        minHeight: 120,
        background: `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`,
        border: styles.plaqueButtonBorder,
        cursor: "pointer",
        textAlign: "left",
        boxShadow: `${styles.plaqueButtonShadow}, ${styles.plaqueAccentGlow}`,
        color: styles.plaqueButtonText,
        backdropFilter: "blur(24px) saturate(124%)",
        WebkitBackdropFilter: "blur(24px) saturate(124%)",
      },
      recentPanel: {
        borderRadius: 34,
        padding: 28,
        background: styles.cardBg,
        boxShadow: styles.cardShadow,
        display: "grid",
        gap: 22,
        border: styles.panelBorder,
        backdropFilter: "blur(20px) saturate(116%)",
        WebkitBackdropFilter: "blur(20px) saturate(116%)",
      },
      recentTitle: {
        fontSize: 22,
        fontWeight: 800,
        color: styles.text,
        letterSpacing: "-0.01em",
      },
    }),
    [styles, isDark, cabinetPath, isV2]
  );

  const ctx = useMemo<CabinetChromeContext>(
    () => ({
      styles,
      layoutStyles,
      cn,
      isV2,
      isDark,
      profilePlaque,
      plaqueName,
      searchQuery,
      normalizedSearch,
      cabinetSection,
      setCabinetSection,
    }),
    [
      styles,
      layoutStyles,
      cn,
      isV2,
      isDark,
      profilePlaque,
      plaqueName,
      searchQuery,
      normalizedSearch,
      cabinetSection,
    ]
  );

  const profileActions = (
    <div
      className={cn.profileBar}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 22,
        background: isV2
          ? undefined
          : isDark
            ? "linear-gradient(145deg, #2b64fd 0%, #5a86fd 100%)"
            : "linear-gradient(145deg, #2b64fd 0%, #5a86fd 100%)",
        boxShadow: isV2
          ? undefined
          : isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 26px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(146, 170, 224, 0.26)"
            : "inset 0 1px 0 rgba(255,255,255,0.2), 0 8px 22px rgba(36, 59, 116, 0.28), 0 0 0 1px rgba(255,255,255,0.2)",
      }}
    >
      <HoverTooltip
        preset={sidebarTooltipPreset}
        isDark={isDark}
        content={<span style={{ whiteSpace: "nowrap" }}>Светлая или тёмная тема оформления</span>}
      >
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label="Переключить тему"
          style={{
            border: "none",
            background: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)",
            padding: 8,
            borderRadius: 12,
            cursor: "pointer",
            boxShadow: isDark
              ? "inset 0 1px 0 rgba(255,255,255,0.18)"
              : "inset 0 1px 0 rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img decoding="async" src={ICON_THEME} alt="" style={{ width: 22, height: 22, display: "block" }} />
        </button>
      </HoverTooltip>
      <button
        type="button"
        onClick={goToProfile}
        aria-label="Профиль"
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "2px 4px",
          fontFamily: "inherit",
        }}
      >
        <img
          decoding="async"
          fetchPriority="high"
          src={ICON_AVATAR}
          alt=""
          width={30}
          height={30}
          style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#f8fafc",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {plaqueName}
        </span>
        <img
          decoding="async"
          src={ICON_PROFILE_CHEVRON}
          alt=""
          width={16}
          height={16}
          style={{ flexShrink: 0, display: "block" }}
        />
      </button>
      <HoverTooltip
        preset={sidebarTooltipPreset}
        isDark={isDark}
        content={<span style={{ whiteSpace: "nowrap" }}>Выйти / сменить роль</span>}
      >
        <button
          type="button"
          onClick={goToRoleSelection}
          aria-label="Выйти"
          style={{
            border: "none",
            background: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.12)",
            padding: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: 12,
            boxShadow: isDark
              ? "inset 0 1px 0 rgba(255,255,255,0.18)"
              : "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <img decoding="async" src={ICON_LOGOUT} alt="" width={22} height={22} />
        </button>
      </HoverTooltip>
    </div>
  );

  const messengerButton = messengerEnabled ? (
    <HoverTooltip
      preset={sidebarTooltipPreset}
      isDark={isDark}
      content={
        <span style={{ whiteSpace: "nowrap" }}>
          {cabinetSection === "messenger"
            ? "Свернуть мессенджер"
            : messengerHasUnread
              ? "Открыть мессенджер — есть непрочитанные"
              : "Открыть мессенджер"}
        </span>
      }
    >
      <div style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          onClick={() =>
            setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"))
          }
          aria-label="Мессенджер"
          className={cx(isV2 && cn.msgrBtn, cabinetSection === "messenger" && cn.msgrActive)}
          style={
            isV2
              ? undefined
              : {
                  border: "none",
                  background:
                    cabinetSection === "messenger"
                      ? isDark
                        ? "rgba(79, 128, 243, 0.35)"
                        : "rgba(36, 59, 116, 0.92)"
                      : styles.buttonBg,
                  padding: 12,
                  borderRadius: "50%",
                  cursor: "pointer",
                  boxShadow:
                    cabinetSection === "messenger"
                      ? `${styles.insetShadow}, 0 0 0 2px rgba(79, 128, 243, 0.65)`
                      : styles.insetShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }
          }
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              stroke="#f8fafc"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {messengerHasUnread && cabinetSection !== "messenger" ? (
          <span className={cx(isV2 && cn.msgrUnread, "tbot-notify-dot")} aria-hidden />
        ) : null}
      </div>
    </HoverTooltip>
  ) : null;

  const searchField = isV2 ? (
    <CabinetV2SearchField value={searchQuery} onChange={handleSearchChange} />
  ) : (
    <div
      className={cn.search}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 22,
        background: styles.sectionBg,
        boxShadow: styles.insetShadow,
        minWidth: 200,
        height: 38,
      }}
    >
      <img decoding="async" src={ICON_SEARCH} alt="" style={{ width: 18, height: 18 }} />
      <input
        className={cn.searchInput}
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Поиск…"
        style={{
          width: 140,
          border: "none",
          outline: "none",
          background: "transparent",
          color: styles.text,
          fontSize: 14,
          lineHeight: "18px",
          height: "100%",
        }}
      />
    </div>
  );

  const mainContent =
    cabinetSection === "messenger" ? (
      <main className={cn.messenger} style={mainRegion}>
        <CabinetMessengerView
          key={messengerMountKey}
          styles={styles}
          isDark={isDark}
          cabinetPath={cabinetPath}
        />
      </main>
    ) : cabinetSection === "events" && renderEvents ? (
      <main className={cx(cn.messenger, "page5-v2__main-region")} style={mainRegion}>
        {renderEvents(ctx)}
      </main>
    ) : (
      children(ctx)
    );

  return (
    <div
      className={cx(
        cn.chrome,
        isV2 && buildCabinetV2SceneClasses(isDark),
        isV2 && useMobileNav && dockItems.length > 0 && "cabinet-chrome--with-dock",
        isV2 && useMobileNav && "cabinet-chrome--mobile-nav"
      )}
      data-cabinet-theme={isV2 ? theme : undefined}
      style={
        isV2
          ? {
              minHeight: "100svh",
              color: styles.text,
              fontFamily: "var(--font-ui)",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }
          : layoutStyles.root
      }
    >
      {isV2 ? (
        <div className={cx(CABINET_V2_SHELL.layout, useMobileNav && "cabinet-v2-layout--mobile-nav")}>
          {!useMobileNav ? (
            <CabinetSoftSidebar groups={railGroups} roleLabel={cabinetRoleLabel} />
          ) : null}
          <div className={CABINET_V2_SHELL.body}>
            <header
              className={cx(
                cn.header,
                CABINET_V2_SHELL.topbar,
                isSearchFirstTopbar && "cabinet-v2-topbar--contractor"
              )}
            >
              <div className="cabinet-v2-topbar__brand">
                {isSearchFirstTopbar ? (
                  searchField
                ) : (
                  <>
                    <h1 className="cabinet-v2-topbar__title">{cabinetTitle}</h1>
                    <p className="cabinet-v2-topbar__meta">{cabinetMeta}</p>
                  </>
                )}
              </div>
              <div className="cabinet-v2-topbar__actions">
                {shouldShowReturnToAdminDashboard() ? (
                  <button
                    type="button"
                    className={cn.adminBack}
                    onClick={goToAdminCabinet}
                    style={{
                      border: "1px solid rgba(36, 59, 116, 0.35)",
                      background: styles.sectionBg,
                      color: styles.text,
                      borderRadius: 22,
                      padding: "8px 14px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: styles.insetShadow,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ← Админ
                  </button>
                ) : null}
                {!isSearchFirstTopbar ? searchField : null}
                <CabinetSoftToolbar
                  theme={theme}
                  onThemeToggle={handleSetTheme}
                  onMessenger={messengerEnabled ? handleToolbarMessenger : undefined}
                  messengerUnread={messengerHasUnread && cabinetSection !== "messenger"}
                  tbotUnread={tbotNotifyDot && cabinetSection !== "messenger"}
                  messengerActive={cabinetSection === "messenger"}
                  messengerLabel={
                    cabinetSection === "messenger"
                      ? "Свернуть мессенджер"
                      : messengerHasUnread
                        ? "Мессенджер — есть непрочитанные"
                        : "Мессенджер"
                  }
                  onNotifications={
                    cabinetPath === "/cabinet-school" ? handleToolbarNotifications : undefined
                  }
                  notificationsLabel="Письма и объявления"
                  avatarEmail={profilePlaque.email.trim().toLowerCase() || undefined}
                  onProfile={goToProfile}
                  onLogout={goToRoleSelection}
                />
              </div>
            </header>
            <div className={cx(CABINET_V2_SHELL.stage, "cabinet-v2-dashboard-stage")}>
              {betaPreviewActive ? (
                <div className="cabinet-beta-preview-banner" role="status">
                  <span>Бета-просмотр — демонстрационный кабинет без учётной записи</span>
                  <button
                    type="button"
                    className="cabinet-beta-preview-banner__action"
                    onClick={goToRoleSelection}
                  >
                    Выйти из просмотра
                  </button>
                </div>
              ) : null}
              {mainContent}
            </div>
          </div>
        </div>
      ) : (
        <div style={layoutStyles.container}>
          <header
            className={cn.header}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 20,
              padding: "24px 28px",
              borderRadius: 32,
              background: styles.surfaceBg,
              boxShadow: styles.cardShadow,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              {shouldShowReturnToAdminDashboard() ? (
                <button
                  type="button"
                  className={cn.adminBack}
                  onClick={goToAdminCabinet}
                  style={{
                    border: "1px solid rgba(36, 59, 116, 0.35)",
                    background: styles.sectionBg,
                    color: styles.text,
                    borderRadius: 22,
                    padding: "8px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: styles.insetShadow,
                    whiteSpace: "nowrap",
                  }}
                >
                  ← Кабинет администратора
                </button>
              ) : null}
              {searchField}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <img
                decoding="async"
                fetchPriority="high"
                src={APP_LOGO_SRC}
                alt="Логотип"
                style={{ width: 160, height: 26, objectFit: "contain" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
              {messengerButton}
              {profileActions}
            </div>
          </header>
          {betaPreviewActive ? (
            <div
              className="cabinet-beta-preview-banner"
              role="status"
              style={{
                borderColor: "rgba(36, 59, 116, 0.28)",
                background: "rgba(36, 59, 116, 0.08)",
                color: styles.text,
              }}
            >
              <span>Бета-просмотр — демонстрационный кабинет без учётной записи</span>
              <button
                type="button"
                className="cabinet-beta-preview-banner__action"
                onClick={goToRoleSelection}
                style={{
                  borderColor: "rgba(36, 59, 116, 0.3)",
                  background: styles.sectionBg,
                  color: styles.text,
                }}
              >
                Выйти из просмотра
              </button>
            </div>
          ) : null}
          {mainContent}
        </div>
      )}
      {isV2 && useMobileNav && dockItems.length > 0 ? (
        <CabinetQuickDock items={dockItems} />
      ) : null}
      <AiChatBubble isDark={isDark} />
    </div>
  );
}

export default memo(CabinetChromeLayout);
