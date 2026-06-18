import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CABINET_THEME_CHANGED,
  loadCabinetTheme,
  loadProfileSettings,
  saveCabinetTheme,
} from "../profileSettingsStorage";
import { formatKpiCount, kpiDeltaBadge, kpiTrendFromCount } from "../utils/kpiCardHelpers";
import {
  type CalendarEventItem,
  getUpcomingEventsForPanel,
} from "../pages/AssociationEventsView";
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
import {
  applyMessengerInvitePayload,
  decodeMessengerInvite,
  MSGR_INVITE_PARAM,
} from "../utils/messengerInvite";
import { buildCabinetChromeClassNames } from "../design-system/cabinetChromeClasses";
import { syncCabinetThemeDocument } from "../design-system/syncCabinetThemeDocument";
import { usePortalDesign } from "../design-system/usePortalDesign";
import { buildAssociationPageTheme } from "../theme/cabinetPalettes";
import {
  APP_LOGO_SRC,
  CABINET_HERO_BG,
  ICON_AVATAR,
  ICON_LOGOUT,
  ICON_PROFILE_CHEVRON,
  ICON_SEARCH,
  ICON_THEME,
} from "../assets/appIcons";
import type { AssociationVariant } from "../pages/association/associationTypes";

export type AssociationCabinetSection = "dashboard" | "events" | "messenger";

export type AssociationPageCard = {
  title: string;
  description: string;
  icon: string;
  accent: string;
  accentSoft: string;
  tag: string;
};

const ASSOCIATION_INTRO_PARAGRAPH =
  "Личный кабинет предназначен для работы со студенческими дорожными командами, планирования мероприятий и ведения документооборота.";

const PAGE5_PRELOAD_IMAGES = [
  ICON_LOGOUT,
  ICON_SEARCH,
  APP_LOGO_SRC,
  ICON_THEME,
  ICON_AVATAR,
  ICON_PROFILE_CHEVRON,
  CABINET_HERO_BG,
] as const;

export function getAssociationCopy(variant: AssociationVariant) {
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

export function useAssociationCabinetState(variant: AssociationVariant) {
  const navigate = useNavigate();
  const location = useLocation();
  const isV2 = usePortalDesign() === "v2";
  const [theme, setTheme] = useState<"light" | "dark">(() => loadCabinetTheme());
  const [profilePlaque, setProfilePlaque] = useState(() => loadProfileSettings());
  const [search, setSearch] = useState("");
  const [cabinetSection, setCabinetSection] = useState<AssociationCabinetSection>("dashboard");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(() =>
    loadSharedCalendarEvents()
  );
  const [messengerSeenAt, setMessengerSeenAt] = useState(() => readMessengerSeenAt());
  const [messengerHasUnread, setMessengerHasUnread] = useState(() =>
    typeof window !== "undefined" ? hasMessengerInboxUnread(readMessengerSeenAt()) : false
  );
  const [messengerMountKey, setMessengerMountKey] = useState(0);

  const associationCopy = useMemo(() => getAssociationCopy(variant), [variant]);
  const basePath = variant === "ado" ? "/page6" : "/page5";
  const associationRoleLabel = variant === "ado" ? "Ассоциация АДО" : "Ассоциация РАДОР";

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

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_CALENDAR_EVENTS_KEY || e.newValue == null) return;
      setCalendarEvents(loadSharedCalendarEvents());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const pageCards = useMemo<AssociationPageCard[]>(
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
  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);
  const cn = useMemo(() => buildCabinetChromeClassNames(isV2), [isV2]);
  const styles = useMemo(
    () => buildAssociationPageTheme(variant, isDark),
    [variant, isDark]
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

  const openEventsSection = useCallback(() => {
    leaveProforientationPath();
    setCabinetSection("events");
  }, [leaveProforientationPath]);

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

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    isV2,
    variant,
    navigate,
    location,
    basePath,
    associationCopy,
    associationRoleLabel,
    theme,
    profilePlaque,
    search,
    handleSearchChange,
    handleToggleTheme,
    cabinetSection,
    setCabinetSection,
    calendarEvents,
    setCalendarEvents,
    messengerHasUnread,
    messengerMountKey,
    upcomingPanelEvents,
    filteredCards,
    associationKpiMetrics,
    leaveProforientationPath,
    openEventsSection,
    isProforientationRoute,
    isAssociationDocumentsMain,
    isIncomingDocumentsRoute,
    isDocumentsSectionRoute,
    isTeamsRoute,
    isFormsRoute,
    isDark,
    styles,
    cn,
    legacyThemeVars,
    proforientationLayoutStyles,
    plaqueName: profilePlaque.firstName.trim() || "Пользователь",
  };
}
