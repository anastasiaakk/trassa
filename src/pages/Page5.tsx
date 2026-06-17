import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CABINET_THEME_CHANGED,
  loadCabinetTheme,
  loadProfileSettings,
  saveCabinetTheme,
} from "../profileSettingsStorage";
import { AiChatBubble } from "../components/AiChatBubble";
import CabinetQuickDock from "../components/CabinetQuickDock";
import CabinetSoftSidebar from "../components/CabinetSoftSidebar";
import CabinetSoftToolbar from "../components/CabinetSoftToolbar";
import CabinetV2SearchField from "../components/CabinetV2SearchField";
import AssociationCabinetDashboardV2 from "../components/cabinet-v2/AssociationCabinetDashboardV2";
import { formatKpiCount, kpiDeltaBadge, kpiTrendFromCount } from "../utils/kpiCardHelpers";
import { FloatingNotes } from "../components/FloatingNotes";
import { getHoverTooltipPreset, HoverTooltip } from "../components/HoverTooltip";
import {
  AUDIENCE_LABELS,
  type CalendarEventItem,
  getUpcomingEventsForPanel,
  Page5EventsView,
} from "./Page5EventsView";
import {
  loadSharedCalendarEvents,
  saveSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
} from "../utils/sharedCalendarEvents";
import { injectImagePreloads } from "../utils/imagePreload";
import {
  hasMessengerInboxUnread,
  markMessengerInboxSeen,
  readMessengerSeenAt,
} from "../utils/messengerUnread";
import { TBOT_NOTIFY_DOT_EVENT } from "../utils/messengerTbotNotify";
import { navigateToProfileSettings } from "../utils/profileNavigation";
import {
  MESSENGER_PEERS_KEY,
  MESSENGER_STORE_KEY,
  saveMessengerStore,
} from "../utils/messengerStorage";
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
  APP_LOGO_SRC,
  CABINET_HERO_BG,
  ICON_AVATAR,
  ICON_LOGOUT,
  ICON_PROFILE_CHEVRON,
  ICON_SEARCH,
  ICON_THEME,
} from "../assets/appIcons";
import { Page5MessengerView } from "./Page5MessengerView";
import {
  buildCabinetChromeClassNames,
  buildCabinetV2SceneClasses,
  CABINET_V2_SHELL,
  cx,
} from "../design-system/cabinetChromeClasses";
import { buildAssociationRailGroups, getAssociationSectionMeta } from "../utils/associationRailItems";
import { buildAssociationDockItems } from "../utils/cabinetDockItems";
import { useCabinetMobileNav } from "../hooks/useCabinetMobileNav";
import { useAssociationRailBadges } from "../hooks/useAssociationRailBadges";
import { getCabinetTitle } from "../utils/cabinetRailItems";
import { syncCabinetThemeDocument } from "../design-system/syncCabinetThemeDocument";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { buildAssociationPageTheme } from "../theme/cabinetPalettes";
import { buildCabinetChromeThemeV2 } from "../theme/cabinetPalettesV2";
import { ProforientationResultsTable } from "../components/ProforientationEmployerPanels";
import AssociationDocumentsView from "./AssociationDocumentsView";
import AssociationIncomingDocumentsView from "./AssociationIncomingDocumentsView";
import AssociationStudentTeamsView from "./AssociationStudentTeamsView";
import RadorFormsHub from "./RadorFormsHub";
import type { CSSProperties } from "react";

export type AssociationVariant = "rador" | "ado";

const ASSOCIATION_INTRO_PARAGRAPH =
  "Личный кабинет предназначен для работы со студенческими дорожными командами, планирования мероприятий и ведения документооборота.";

function getAssociationCopy(variant: AssociationVariant) {
  if (variant === "ado") {
    return {
      archiveTag: "Архив ADO",
      badgeTitle: "Ассоциация \"АДО\"",
      introParagraph: ASSOCIATION_INTRO_PARAGRAPH,
    };
  }
  return {
    archiveTag: "Архив RADOR",
    badgeTitle: "Ассоциация \"РАДОР\"",
    introParagraph: ASSOCIATION_INTRO_PARAGRAPH,
  };
}

type CabinetSection = "dashboard" | "events" | "messenger";

/** Локальная симуляция входящего (нет сервера). Для проверки: сверните мессенджер — точка на Т-боте. */
function injectMessengerTestIncoming(): void {
  try {
    let peerId = "p1";
    const pr = localStorage.getItem(MESSENGER_PEERS_KEY);
    if (pr) {
      const peers = JSON.parse(pr) as Array<{ id: string }>;
      if (Array.isArray(peers) && peers[0]?.id) peerId = peers[0].id;
    }
    const raw = localStorage.getItem(MESSENGER_STORE_KEY);
    const data = (raw ? JSON.parse(raw) : {}) as Record<
      string,
      Array<{ id: string; threadId: string; author: string; text: string; createdAt: string }>
    >;
    const arr = data[peerId] ?? [];
    const msg = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      threadId: peerId,
      author: peerId,
      text: "Привет! Это тестовое входящее — проверка индикатора на иконке мессенджера.",
      createdAt: new Date().toISOString(),
    };
    data[peerId] = [...arr, msg];
    saveMessengerStore(data as Record<string, unknown>);
  } catch {
    /* ignore */
  }
}

const PAGE5_PRELOAD_IMAGES = [
  ICON_LOGOUT,
  ICON_SEARCH,
  APP_LOGO_SRC,
  ICON_THEME,
  ICON_AVATAR,
  ICON_PROFILE_CHEVRON,
  CABINET_HERO_BG,
] as const;

export function AssociationPage({ variant }: { variant: AssociationVariant }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isV2 = usePortalDesign() === "v2";
  const useMobileNav = useCabinetMobileNav();
  const [theme, setTheme] = useState<"light" | "dark">(() => loadCabinetTheme());
  const [profilePlaque, setProfilePlaque] = useState(() => loadProfileSettings());
  const [search, setSearch] = useState("");
  const [cabinetSection, setCabinetSection] = useState<CabinetSection>("dashboard");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(() =>
    loadSharedCalendarEvents()
  );
  const [messengerSeenAt, setMessengerSeenAt] = useState(() => readMessengerSeenAt());
  const [messengerHasUnread, setMessengerHasUnread] = useState(() =>
    typeof window !== "undefined" ? hasMessengerInboxUnread(readMessengerSeenAt()) : false
  );
  const [tbotNotifyDot, setTbotNotifyDot] = useState(false);
  /** Сброс монтирования мессенджера после применения приглашения по ссылке */
  const [messengerMountKey, setMessengerMountKey] = useState(0);
  const associationRailBadges = useAssociationRailBadges();

  const associationCopy = useMemo(() => getAssociationCopy(variant), [variant]);

  const basePath = variant === "ado" ? "/page6" : "/page5";
  const isProforientationRoute = location.pathname === `${basePath}/proforientation`;
  const isAssociationDocumentsMain = location.pathname === `${basePath}/documents`;
  const isIncomingDocumentsRoute = location.pathname === `${basePath}/documents/incoming`;
  const isDocumentsSectionRoute = isAssociationDocumentsMain || isIncomingDocumentsRoute;
  const isTeamsRoute = location.pathname === `${basePath}/teams`;
  const isFormsRoute = location.pathname === `${basePath}/forms`;

  const leaveProforientationPath = useCallback(() => {
    const nested = [
      `${basePath}/proforientation`,
      `${basePath}/documents`,
      `${basePath}/documents/incoming`,
      `${basePath}/teams`,
    ];
    if (nested.includes(location.pathname)) {
      navigate(basePath, { replace: true });
    }
  }, [basePath, location.pathname, navigate]);

  const recalcMessengerBadge = useCallback(() => {
    if (cabinetSection === "messenger") {
      setMessengerHasUnread(false);
      return;
    }
    setMessengerHasUnread(hasMessengerInboxUnread(messengerSeenAt));
  }, [cabinetSection, messengerSeenAt]);

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
    const onUpd = () => recalcMessengerBadge();
    window.addEventListener("trassa-messenger-updated", onUpd);
    return () => window.removeEventListener("trassa-messenger-updated", onUpd);
  }, [recalcMessengerBadge]);

  useEffect(() => {
    if (cabinetSection !== "messenger") return;
    const t = Date.now();
    markMessengerInboxSeen(t);
    setMessengerSeenAt(t);
    setMessengerHasUnread(false);
  }, [cabinetSection]);

  /** Ссылка вида #/page5?messengerInvite=… — открыть мессенджер и добавить контакт из приглашения */
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get(MSGR_INVITE_PARAM);
    if (!t) return;
    const data = decodeMessengerInvite(t);
    if (!data) {
      navigate({ pathname: location.pathname, search: "" }, { replace: true });
      return;
    }
    applyMessengerInvitePayload(data);
    const nested = [
      `${basePath}/proforientation`,
      `${basePath}/documents`,
      `${basePath}/documents/incoming`,
      `${basePath}/teams`,
    ];
    if (nested.includes(location.pathname)) {
      navigate(basePath, { replace: true });
    }
    setCabinetSection("messenger");
    setMessengerMountKey((k) => k + 1);
    navigate({ pathname: location.pathname, search: "" }, { replace: true });
  }, [location.search, location.pathname, navigate, basePath]);

  const upcomingPanelEvents = useMemo(
    () => getUpcomingEventsForPanel(calendarEvents, 6),
    [calendarEvents]
  );

  useEffect(() => {
    saveSharedCalendarEvents(calendarEvents);
  }, [calendarEvents]);

  /** Другая вкладка изменила календарь — подтянуть без цикла (в своей вкладке состояние уже актуально). */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_CALENDAR_EVENTS_KEY || e.newValue == null) return;
      setCalendarEvents(loadSharedCalendarEvents());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pageCards = useMemo(
    () => [
      {
        title: "Студенческие дорожные команды",
        description:
          "Запросы и ответы ТОУАД, свод обращений и работа с корпоративными шаблонами в одном контуре.",
        icon: "🚧",
        accent: "#2b64fd",
        accentSoft: "rgba(43, 100, 253, 0.22)",
        tag: "Рабочий контур",
      },
      {
        title: "Мероприятия",
        description:
          "Календарь отрасли: очные и онлайн-активности, встречи и контрольные даты для участников.",
        icon: "📰",
        accent: "#6f95ff",
        accentSoft: "rgba(111, 149, 255, 0.22)",
        tag: "Афиша",
      },
      {
        title: "Таблицы подрядчиков",
        description:
          "Процент заполнения шаблонов и итоговые срезы на дату срока сдачи.",
        icon: "📊",
        accent: "#204fd2",
        accentSoft: "rgba(32, 79, 210, 0.2)",
        tag: "Мониторинг",
      },
      {
        title: "Документы",
        description:
          "Публикация материалов, обмен файлами и единое хранилище сводной документации.",
        icon: "📃",
        accent: "#7c89a6",
        accentSoft: "rgba(124, 137, 166, 0.2)",
        tag: associationCopy.archiveTag,
      },
    ],
    [associationCopy.archiveTag]
  );

  const isDark = theme === "dark";

  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleSetTheme = useCallback((next: "light" | "dark") => {
    setTheme(next);
  }, []);

  const handleToolbarMessenger = useCallback(() => {
    leaveProforientationPath();
    setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"));
  }, [leaveProforientationPath]);

  const goToRoleSelection = useCallback(() => {
    clearAdminReturnMark();
    navigate("/page3");
  }, [navigate]);

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  const goToProfile = useCallback(() => {
    navigateToProfileSettings(navigate, location.pathname);
  }, [navigate, location.pathname]);

  const cn = useMemo(() => buildCabinetChromeClassNames(isV2), [isV2]);
  const styles = useMemo(
    () => (isV2 ? buildCabinetChromeThemeV2(basePath, isDark) : buildAssociationPageTheme(variant, isDark)),
    [variant, isDark, isV2, basePath]
  );

  const legacyCardAccentStyle = useCallback(
    (accent: string): CSSProperties => ({ "--p5l-card-accent": accent }) as CSSProperties,
    []
  );

  const proforientationLayoutStyles = useMemo(
    () =>
      ({
        recentPanel: {
          borderRadius: 32,
          padding: "22px 28px 28px",
          background: styles.cardBg,
          boxShadow: styles.cardShadow,
          display: "grid",
          gap: 22,
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #d9e2f1",
        },
        recentTitle: {
          fontSize: 22,
          fontWeight: 800,
          color: styles.text,
        },
      }) satisfies Record<string, CSSProperties>,
    [styles, isDark]
  );

  useEffect(() => {
    saveCabinetTheme(theme);
    syncCabinetThemeDocument(isV2 ? theme : undefined);
  }, [theme, isV2]);

  useEffect(() => {
    const syncTheme = () => setTheme(loadCabinetTheme());
    window.addEventListener(CABINET_THEME_CHANGED, syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener(CABINET_THEME_CHANGED, syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

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
    return injectImagePreloads(PAGE5_PRELOAD_IMAGES);
  }, []);

  useEffect(() => {
    document.body.style.backgroundColor = styles.pageBg;
  }, [styles.pageBg]);

  const filteredCards = useMemo(
    () =>
      pageCards.filter(
        (card) =>
          !normalizedSearch ||
          card.title.toLowerCase().includes(normalizedSearch) ||
          card.description.toLowerCase().includes(normalizedSearch)
      ),
    [normalizedSearch, pageCards]
  );

  const plaqueName = profilePlaque.firstName.trim() || "Пользователь";

  const openEventsSection = useCallback(() => {
    leaveProforientationPath();
    setCabinetSection("events");
  }, [leaveProforientationPath]);

  const dockItems = useMemo(
    () =>
      isV2
        ? buildAssociationDockItems({
            basePath,
            pathname: location.pathname,
            cabinetSection,
            messengerHasUnread,
            navigate,
            setCabinetSection,
            onOpenEvents: openEventsSection,
          })
        : [],
    [
      isV2,
      basePath,
      location.pathname,
      cabinetSection,
      messengerHasUnread,
      navigate,
      openEventsSection,
    ]
  );

  const railGroups = useMemo(
    () =>
      isV2
        ? buildAssociationRailGroups({
            basePath,
            pathname: location.pathname,
            cabinetSection,
            navigate,
            setCabinetSection,
            onOpenEvents: openEventsSection,
            badgeOverrides: associationRailBadges,
          })
        : [],
    [
      isV2,
      basePath,
      location.pathname,
      cabinetSection,
      navigate,
      openEventsSection,
      setCabinetSection,
      associationRailBadges,
    ]
  );

  const associationRoleLabel = variant === "ado" ? "Ассоциация АДО" : "Ассоциация РАДОР";

  const cabinetTitle = useMemo(() => getCabinetTitle(basePath), [basePath]);
  const cabinetMeta = useMemo(
    () => getAssociationSectionMeta(location.pathname, basePath, cabinetSection),
    [location.pathname, basePath, cabinetSection]
  );

  const isV2DashboardHome =
    isV2 &&
    location.pathname === basePath &&
    cabinetSection === "dashboard" &&
    !isProforientationRoute &&
    !isDocumentsSectionRoute &&
    !isTeamsRoute &&
    !isFormsRoute;

  const associationKpiMetrics = useMemo(() => {
    const events = upcomingPanelEvents.length;
    const calendarTotal = calendarEvents.length;
    const sections = pageCards.length;
    return [
      {
        id: "events",
        label: "Событий в календаре",
        value: formatKpiCount(events),
        trend: kpiTrendFromCount(events),
        trendLabel: kpiDeltaBadge(events),
        insight:
          events > 0
            ? "Ближайшие даты из общего календаря ассоциации."
            : "Добавьте мероприятия в календарь на главной.",
        insightActionLabel: "Открыть календарь",
        onInsightClick: openEventsSection,
      },
      {
        id: "calendar",
        label: "Записей в календаре",
        value: formatKpiCount(calendarTotal),
        trend: kpiTrendFromCount(calendarTotal),
        trendLabel: kpiDeltaBadge(calendarTotal),
        insight: "Все события, включая прошедшие и будущие.",
      },
      {
        id: "sections",
        label: "Разделов на главной",
        value: formatKpiCount(sections),
        trend: "neutral" as const,
        insight: "Дорожные команды, документы, формы и профориентация.",
      },
      {
        id: "messenger",
        label: "Мессенджер",
        value: messengerHasUnread ? "Новое" : "Ок",
        trend: messengerHasUnread ? ("up" as const) : ("neutral" as const),
        trendLabel: messengerHasUnread ? "!" : undefined,
        insight: messengerHasUnread
          ? "Есть непрочитанные сообщения от участников."
          : "Переписка с подрядчиками и партнёрами.",
        insightActionLabel: "Открыть мессенджер",
        onInsightClick: () => setCabinetSection("messenger"),
      },
    ];
  }, [
    upcomingPanelEvents.length,
    calendarEvents.length,
    pageCards.length,
    messengerHasUnread,
    openEventsSection,
  ]);

  const legacyThemeVars = useMemo(
    (): CSSProperties =>
      ({
        "--p5l-text": styles.text,
        "--p5l-muted": styles.muted,
        "--p5l-surface": styles.surfaceBg,
        "--p5l-section": styles.sectionBg,
        "--p5l-card": styles.cardBg,
        "--p5l-button-bg": styles.buttonBg,
        "--p5l-card-shadow": styles.cardShadow,
        "--p5l-inset-shadow": styles.insetShadow,
      }) as CSSProperties,
    [styles]
  );

  return (
    <div
      className={cx(
        isV2 && cn.chrome,
        isV2 && "page5-chrome cabinet-chrome--v2",
        isV2 && buildCabinetV2SceneClasses(theme === "dark"),
        isV2 && "page5-v2__root",
        isV2 && useMobileNav && dockItems.length > 0 && "page5-chrome--with-dock",
        isV2 && useMobileNav && "cabinet-chrome--mobile-nav"
      )}
      data-cabinet-theme={isV2 ? theme : undefined}
      style={
        isV2
          ? undefined
          : {
              minHeight: "100vh",
              background: styles.pageBg,
              color: styles.text,
              fontFamily: "var(--font-ui)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }
      }
    >
      {isV2 ? (
        <div className={cx(CABINET_V2_SHELL.layout, useMobileNav && "cabinet-v2-layout--mobile-nav")}>
          {!useMobileNav ? (
            <CabinetSoftSidebar groups={railGroups} roleLabel={associationRoleLabel} />
          ) : null}
          <div className={CABINET_V2_SHELL.body}>
            <header className={cx(cn.header, CABINET_V2_SHELL.topbar)}>
              <div className="cabinet-v2-topbar__brand">
                <h1 className="cabinet-v2-topbar__title">{cabinetTitle}</h1>
                <p className="cabinet-v2-topbar__meta">{cabinetMeta}</p>
              </div>
              <div className="cabinet-v2-topbar__actions">
                {shouldShowReturnToAdminDashboard() ? (
                  <button
                    type="button"
                    onClick={goToAdminCabinet}
                    className="page5-v2__admin-back-btn"
                  >
                    ← Админ
                  </button>
                ) : null}
                <CabinetV2SearchField
                  value={search}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
                <CabinetSoftToolbar
                  theme={theme}
                  onThemeToggle={handleSetTheme}
                  onMessenger={handleToolbarMessenger}
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
                  avatarEmail={profilePlaque.email.trim().toLowerCase() || undefined}
                  onProfile={goToProfile}
                  onLogout={goToRoleSelection}
                />
              </div>
            </header>
            <div className={cx(CABINET_V2_SHELL.stage, "cabinet-v2-dashboard-stage")}>
              {isV2DashboardHome ? (
                <>
                  <AssociationCabinetDashboardV2
                    basePath={basePath}
                    badgeTitle={associationCopy.badgeTitle}
                    introParagraph={associationCopy.introParagraph}
                    filteredCards={filteredCards}
                    upcomingEvents={upcomingPanelEvents}
                    calendarEvents={calendarEvents}
                    onCalendarEventsChange={setCalendarEvents}
                    cn={cn}
                    isDark={isDark}
                    isProforientationRoute={isProforientationRoute}
                    leaveProforientationPath={leaveProforientationPath}
                    setCabinetSection={setCabinetSection}
                    sidebarTooltipPreset={sidebarTooltipPreset}
                    normalizedSearch={normalizedSearch}
                  />
                </>
              ) : cabinetSection === "events" ? (
                <main className="page5-v2__main-region">
                  <Page5EventsView styles={styles} isDark={isDark} events={calendarEvents} onEventsChange={setCalendarEvents} />
                </main>
              ) : cabinetSection === "messenger" ? (
                <main className={cx(cn.messenger, "page5-v2__main-region")}>
                  <Page5MessengerView key={messengerMountKey} styles={styles} isDark={isDark} cabinetPath={location.pathname} />
                </main>
              ) : isIncomingDocumentsRoute ? (
                <main className="page5-v2__main-region">
                  <AssociationIncomingDocumentsView styles={styles} association={variant === "ado" ? "ado" : "rador"} layoutStyles={proforientationLayoutStyles} basePath={basePath} isV2 />
                </main>
              ) : isAssociationDocumentsMain ? (
                <main className="page5-v2__main-region">
                  <AssociationDocumentsView styles={styles} association={variant === "ado" ? "ado" : "rador"} layoutStyles={proforientationLayoutStyles} incomingDocumentsPath={`${basePath}/documents/incoming`} isDark={isDark} isV2 />
                </main>
              ) : isTeamsRoute ? (
                <main className="page5-v2__main-region page5-v2__main-region--flush-top">
                  <AssociationStudentTeamsView styles={styles} association={variant === "ado" ? "ado" : "rador"} layoutStyles={proforientationLayoutStyles} isV2 />
                </main>
              ) : isFormsRoute ? (
                <main className="page5-v2__main-region">
                  <RadorFormsHub layoutStyles={proforientationLayoutStyles} />
                </main>
              ) : isProforientationRoute ? (
                <main className="page5-v2__main-region page5-v2__main-region--flush-top">
                  <ProforientationResultsTable styles={styles} layoutStyles={proforientationLayoutStyles} />
                </main>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
      <div
        className="page5-legacy__shell"
        style={legacyThemeVars}
        data-cabinet-theme={theme}
      >
        <header className={cx(cn.header, "page5-legacy__header")}>
          <div className="page5-legacy__header-left">
            {shouldShowReturnToAdminDashboard() ? (
              <button
                type="button"
                onClick={goToAdminCabinet}
                className="page5-legacy__admin-back-btn"
              >
                ← Кабинет администратора
              </button>
            ) : null}
            <div className={cx(cn.search, "page5-legacy__search")}>
              <img
                decoding="async"
                src={ICON_SEARCH}
                alt="search icon"
                className="page5-legacy__search-icon"
              />
              <input
                className={cx(cn.searchInput, "page5-legacy__search-input")}
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Поиск…"
              />
            </div>
          </div>

          <div className="page5-legacy__logo-wrap">
            <img
              decoding="async"
              fetchPriority="high"
              src={APP_LOGO_SRC}
              alt="Логотип"
              className="page5-legacy__logo"
            />
          </div>

          <div className="page5-legacy__header-right">
            <HoverTooltip
              preset={sidebarTooltipPreset}
              isDark={isDark}
              content={
                <span className="page5-legacy__tooltip-nowrap">
                  {cabinetSection === "messenger"
                    ? "Свернуть мессенджер"
                    : messengerHasUnread
                      ? "Открыть мессенджер — есть непрочитанные"
                      : "Открыть мессенджер"}
                </span>
              }
            >
              <div className="page5-legacy__msgr-wrap">
                <button
                  type="button"
                  onClick={() => {
                    leaveProforientationPath();
                    setCabinetSection((prev) => (prev === "messenger" ? "dashboard" : "messenger"));
                  }}
                  aria-label="Мессенджер"
                  className={cx(
                    "page5-legacy__msgr-btn",
                    cabinetSection === "messenger" && "page5-legacy__msgr-btn--active"
                  )}
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
                  <span className="page5-legacy__msgr-unread-dot tbot-notify-dot" aria-hidden />
                ) : null}
              </div>
            </HoverTooltip>
            {import.meta.env.DEV ? (
              <button
                type="button"
                onClick={() => injectMessengerTestIncoming()}
                title="Симуляция входящего сообщения. Сверните мессенджер — на иконке появится точка."
                className="page5-legacy__test-btn"
              >
                Тест: входящее
              </button>
            ) : null}
            <div className={cx(cn.profileBar, "page5-legacy__profile-bar")}>
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span className="page5-legacy__tooltip-nowrap">Светлая или тёмная тема оформления</span>}
              >
                <button
                  type="button"
                  onClick={handleToggleTheme}
                  aria-label="Переключить тему"
                  className="page5-legacy__icon-btn"
                >
                  <img
                    decoding="async"
                    src={ICON_THEME}
                    alt=""
                    className="page5-legacy__icon-22"
                  />
                </button>
              </HoverTooltip>
              <button
                type="button"
                onClick={goToProfile}
                aria-label="Профиль"
                className="page5-legacy__profile-trigger"
              >
                <img
                  decoding="async"
                  fetchPriority="high"
                  src={ICON_AVATAR}
                  alt=""
                  className="page5-legacy__avatar-30"
                />
                <span
                  className="page5-legacy__profile-name"
                >
                  {plaqueName}
                </span>
                <img
                  decoding="async"
                  src={ICON_PROFILE_CHEVRON}
                  alt=""
                  className="page5-legacy__icon-16"
                />
              </button>
              <HoverTooltip
                preset={sidebarTooltipPreset}
                isDark={isDark}
                content={<span className="page5-legacy__tooltip-nowrap">Выйти / сменить роль</span>}
              >
                <button
                  type="button"
                  onClick={goToRoleSelection}
                  aria-label="Выйти"
                  className="page5-legacy__icon-btn"
                >
                  <img decoding="async" src={ICON_LOGOUT} alt="" className="page5-legacy__icon-22" />
                </button>
              </HoverTooltip>
            </div>
          </div>
        </header>

        {!isV2 ? (
        <nav
          className="page5-legacy__nav"
          aria-label="Разделы кабинета"
        >
          <div className="page5-legacy__nav-row">
            <button
              type="button"
              onClick={() => {
                navigate(basePath);
                setCabinetSection("dashboard");
              }}
              className={cx(
                "page5-legacy__nav-btn",
                !isProforientationRoute &&
                  !isDocumentsSectionRoute &&
                  !isTeamsRoute &&
                  cabinetSection === "dashboard" &&
                  "page5-legacy__nav-btn--active"
              )}
            >
              Главная
            </button>
            <button
              type="button"
              onClick={() => {
                leaveProforientationPath();
                setCabinetSection("events");
              }}
              className={cx(
                "page5-legacy__nav-btn",
                cabinetSection === "events" && "page5-legacy__nav-btn--active"
              )}
            >
              Мероприятия
            </button>
          </div>
        </nav>
        ) : null}

        {!isV2 && cabinetSection === "events" ? (
          <main className="page5-legacy__main-region">
            <Page5EventsView
              styles={styles}
              isDark={isDark}
              events={calendarEvents}
              onEventsChange={setCalendarEvents}
            />
          </main>
        ) : cabinetSection === "messenger" ? (
          <main className="page5-legacy__main-region">
            <Page5MessengerView
              key={messengerMountKey}
              styles={styles}
              isDark={isDark}
              cabinetPath={location.pathname}
            />
          </main>
        ) : isIncomingDocumentsRoute ? (
          <main className="page5-legacy__main-region page5-legacy__main-region--stack">
            <AssociationIncomingDocumentsView
              styles={styles}
              association={variant === "ado" ? "ado" : "rador"}
              layoutStyles={proforientationLayoutStyles}
              basePath={basePath}
            />
          </main>
        ) : isAssociationDocumentsMain ? (
          <main className="page5-legacy__main-region page5-legacy__main-region--stack">
            <AssociationDocumentsView
              styles={styles}
              association={variant === "ado" ? "ado" : "rador"}
              layoutStyles={proforientationLayoutStyles}
              incomingDocumentsPath={`${basePath}/documents/incoming`}
              isDark={isDark}
            />
          </main>
        ) : isTeamsRoute ? (
          <main className="page5-legacy__main-region page5-legacy__main-region--flush-top">
            <AssociationStudentTeamsView
              styles={styles}
              association={variant === "ado" ? "ado" : "rador"}
              layoutStyles={proforientationLayoutStyles}
            />
          </main>
        ) : isFormsRoute ? (
          <main className="page5-legacy__main-region">
            <RadorFormsHub layoutStyles={proforientationLayoutStyles} />
          </main>
        ) : isProforientationRoute ? (
          <main className="page5-legacy__main-region page5-legacy__main-region--flush-top">
            <ProforientationResultsTable styles={styles} layoutStyles={proforientationLayoutStyles} />
          </main>
        ) : (
        <>
        <main className="page5-legacy__main-grid">
          <section className="page5-legacy__hero-panel">
            <div className="page5-legacy__hero-top">
              <div className="page5-legacy__hero-copy">
                <div className="page5-legacy__hero-kicker">{associationCopy.badgeTitle}</div>
                <h1 className="page5-legacy__hero-title">
                  Запросы, свод информации и связь со всеми участниками
                </h1>
                <p className="page5-legacy__hero-lead">{associationCopy.introParagraph}</p>
              </div>

              <div className="page5-legacy__status-panel">
                <div className="page5-legacy__status-kicker">Статус кабинета</div>
                <div className="page5-legacy__status-copy">
                  Прозрачный обзор работы подрядчиков, статистика ответов и статус документов.
                </div>
                <div className="page5-legacy__metrics-wrap">
                  <div className="page5-legacy__metrics">
                    {associationKpiMetrics.map((metric) => (
                      <div key={metric.id} className="page5-legacy__metric">
                        <div className="page5-legacy__metric-label">{metric.label}</div>
                        <div className="page5-legacy__metric-value">{metric.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="page5-legacy__cards-grid">
              {filteredCards.map((card) => (
                <div
                  key={card.title}
                  className="page5-legacy__section-card"
                  style={legacyCardAccentStyle(card.accent)}
                >
                  <div className="page5-legacy__card-accent" aria-hidden />
                  <div className="page5-legacy__card-body">
                    <div className="page5-legacy__card-head">
                      <span className="page5-legacy__card-tag">{card.tag}</span>
                      <div className="page5-legacy__card-icon-well">{card.icon}</div>
                    </div>
                    <div className="page5-legacy__card-title">{card.title}</div>
                    <p className="page5-legacy__card-desc">{card.description}</p>
                  </div>

                  <div className="page5-legacy__card-footer">
                    <button
                      type="button"
                      className="softtouch-plaque page5-legacy__card-open"
                      onClick={() => {
                        leaveProforientationPath();
                        if (card.title === "Мероприятия") {
                          setCabinetSection("events");
                        } else if (card.title === "Студенческие дорожные команды") {
                          navigate(`${basePath}/teams`);
                        } else if (card.title === "Документы") {
                          navigate(`${basePath}/documents`);
                        } else if (card.title === "Таблицы подрядчиков") {
                          navigate(`${basePath}/forms`);
                        }
                      }}
                    >
                      Открыть
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className={cx(
                "page5-legacy__proforientation-btn",
                isProforientationRoute && "page5-legacy__proforientation-btn--active"
              )}
              onClick={() => navigate(`${basePath}/proforientation`)}
            >
              <div className="page5-legacy__proforientation-kicker">ПРОФОРИЕНТАЦИЯ</div>
              <div className="page5-legacy__proforientation-title">Результаты теста</div>
              <div className="page5-legacy__proforientation-desc">
                Школьники и студенты — открыть отчёт →
              </div>
            </button>
          </section>

          <aside className="page5-legacy__aside">
            <div className="page5-legacy__aside-card">
              <div className="page5-legacy__aside-title">Приволжский федеральный округ</div>
              <div className="page5-legacy__aside-meta">Ответил на 3 из 4 запросов</div>
              <div className="page5-legacy__progress-track">
                <div className="page5-legacy__progress-fill" />
              </div>
              <div className="page5-legacy__aside-kpi">84% исполнения</div>
            </div>

            <div className="page5-legacy__events-panel">
              <div className="page5-legacy__events-title">Ближайшие мероприятия</div>
              <div className="page5-legacy__events-list">
                {upcomingPanelEvents.length === 0 ? (
                  <div className="page5-legacy__events-empty">
                    Созданных мероприятий пока нет. Добавьте их во вкладке «Мероприятия» — они появятся здесь.
                  </div>
                ) : (
                  upcomingPanelEvents.map((ev) => {
                    const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    return (
                      <div key={ev.id} className="page5-legacy__event-row">
                        <button
                          type="button"
                          onClick={() => {
                            leaveProforientationPath();
                            setCabinetSection("events");
                          }}
                          className="page5-legacy__event-link"
                        >
                          <div className="page5-legacy__event-title">{ev.title}</div>
                          <div className="page5-legacy__event-meta">
                            {dateLabel} · {ev.time} · {AUDIENCE_LABELS[ev.audience]}
                          </div>
                          {ev.description ? (
                            <div className="page5-legacy__event-desc">
                              {ev.description.length > 120 ? `${ev.description.slice(0, 120)}…` : ev.description}
                            </div>
                          ) : null}
                        </button>
                        <HoverTooltip
                          preset={sidebarTooltipPreset}
                          isDark={isDark}
                          content={<span className="page5-legacy__tooltip-nowrap">Отменить мероприятие</span>}
                        >
                          <button
                            type="button"
                            aria-label="Отменить мероприятие"
                            onClick={() =>
                              setCalendarEvents((prev) =>
                                prev.map((item) =>
                                  item.id === ev.id ? { ...item, cancelled: true } : item
                                )
                              )
                            }
                            className="page5-legacy__event-cancel"
                          >
                            ×
                          </button>
                        </HoverTooltip>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </main>
        </>
        )}
      </div>
      )}
      <FloatingNotes isDark={isDark} />
      {isV2 && useMobileNav && dockItems.length > 0 ? (
        <CabinetQuickDock items={dockItems} />
      ) : null}
      <AiChatBubble isDark={isDark} />
    </div>
  );
}

function Page5() {
  return <AssociationPage variant="rador" />;
}

export default memo(Page5);
