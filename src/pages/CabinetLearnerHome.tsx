import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import CabinetHomeIcon from "../components/CabinetHomeIcon";
import {
  AUDIENCE_LABELS,
  getUpcomingEventsForPanel,
  type CalendarEventItem,
} from "./Page5EventsView";
import {
  loadSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
  SHARED_CALENDAR_UPDATED_EVENT,
} from "../utils/sharedCalendarEvents";
import ProforientationTestSection from "../components/ProforientationTestSection";
import { ROLE_ICON_SCHOOL, ROLE_ICON_STUDENT } from "../assets/appIcons";

const CABINET_HERO_SCHOOL = new URL("../assets/cabinet-hero-school.png", import.meta.url).href;
const CABINET_HERO_STUDENT = new URL("../assets/cabinet-hero-student.png", import.meta.url).href;

export type LearnerCabinetVariant = "school" | "spo";

const DASHBOARD_COPY: Record<
  LearnerCabinetVariant,
  {
    cabinetPath: string;
    asideBadge: string;
    sideCardTitle: string;
    sideCardKicker: string;
    sideCardText: string;
    sideBlocks: { title: string; text: string }[];
    heroTag: string;
    heroTitleFallback: string;
    info: { label: string; title: string; text: string };
    actions: { title: string; text: string }[];
    eventsHint: string;
    eventsEmpty: string;
  }
> = {
  school: {
    cabinetPath: "/cabinet-school",
    asideBadge: "3",
    sideCardKicker: "Трек обучения",
    sideCardTitle: "Школьный модуль 2026",
    sideCardText:
      "Соберите материалы по дорожной тематике и участвуйте в мероприятиях ассоциаций — прогресс отображается в одном окне.",
    sideBlocks: [
      {
        title: "Материалы и задания",
        text: "Доступ к тематическим блокам и проверочным заданиям по мере наполнения курса.",
      },
    ],
    heroTag: "Школа · материалы и события",
    heroTitleFallback: "Укажите имя в настройках профиля — оно отобразится на главной карточке.",
    info: {
      label: "Ассоциации РАДОР и АДО",
      title: "Приглашение на отраслевую неделю",
      text: "Следите за письмами и объявлениями: регистрация на очные и онлайн-активности для школьных команд.",
    },
    actions: [
      {
        title: "Объявления и письма",
        text: "Список обращений от ассоциаций и ответов по вашей учётной записи.",
      },
      {
        title: "Календарь активностей",
        text: "Личные дедлайны и командные вехи в одном расписании.",
      },
    ],
    eventsHint:
      "Мероприятия с аудиторией «Школьники», которые публикуют РАДОР и АДО во вкладке «Мероприятия».",
    eventsEmpty:
      "Пока нет запланированных мероприятий для школьников. Когда ассоциации добавят события с такой аудиторией, они появятся здесь.",
  },
  spo: {
    cabinetPath: "/cabinet-spo",
    asideBadge: "3",
    sideCardKicker: "Учебный план",
    sideCardTitle: "Практика и курсы СПО/ВО",
    sideCardText:
      "Связь с дорожной отраслью: практики, стажировки и учебные модули — в одном контуре с ассоциациями.",
    sideBlocks: [
      {
        title: "Практика и стажировки",
        text: "Заявки и статусы согласования — по мере подключения организаций-партнёров.",
      },
      {
        title: "Учебные модули",
        text: "Рекомендованные материалы и отраслевые курсы для профильной подготовки.",
      },
    ],
    heroTag: "СПО и ВО · практика и карьера",
    heroTitleFallback: "Укажите имя в настройках профиля — оно отобразится на главной карточке.",
    info: {
      label: "Партнёры отрасли",
      title: "Летняя практика и кейсы подрядчиков",
      text: "Просматривайте запросы на практику и отклики: документы и сопровождение — в привычных шаблонах портала.",
    },
    actions: [
      {
        title: "Заявки и ответы",
        text: "Переписка по практике и уведомления от кураторов программ.",
      },
      {
        title: "Портфолио достижений",
        text: "Фиксация проектов и мероприятий для резюме и отбора.",
      },
    ],
    eventsHint:
      "Мероприятия с аудиторией «Студенты», которые публикуют РАДОР и АДО во вкладке «Мероприятия».",
    eventsEmpty:
      "Пока нет запланированных мероприятий для студентов. Когда ассоциации добавят события с такой аудиторией, они появятся здесь.",
  },
};

function filterEventsForVariant(events: CalendarEventItem[], variant: LearnerCabinetVariant): CalendarEventItem[] {
  const aud = variant === "school" ? "schools" : "students";
  return getUpcomingEventsForPanel(
    events.filter((ev) => ev.audience === aud),
    6
  );
}

function LearnerCabinetDashboard({
  ctx,
  variant,
}: {
  ctx: CabinetChromeContext;
  variant: LearnerCabinetVariant;
}) {
  const { styles, layoutStyles, profilePlaque, isDark } = ctx;
  const CHIP_WRAP_RADIUS = 999;
  const CHIP_HEIGHT = 38;
  const CHIP_RADIUS = 999;
  const copy = DASHBOARD_COPY[variant];

  const heroCardStyle = useMemo(() => {
    const heroUrl = variant === "school" ? CABINET_HERO_SCHOOL : CABINET_HERO_STUDENT;
    return {
      ...layoutStyles.heroCard,
      backgroundImage:
        "linear-gradient(180deg, rgba(" +
        (isDark ? "15,23,42,0.58" : "46,69,108,0.45") +
        ") 0%, rgba(" +
        (isDark ? "15,23,42,0.72" : "34,56,88,0.52") +
        ") 100%), url('" +
        heroUrl +
        "')",
      backgroundSize: "cover",
      backgroundPosition: "center center",
      filter: "none",
    };
  }, [layoutStyles.heroCard, isDark, variant]);
  const heroRoleIconSrc = variant === "school" ? ROLE_ICON_SCHOOL : ROLE_ICON_STUDENT;
  const navigate = useNavigate();
  const location = useLocation();

  const [sharedCalendarEvents, setSharedCalendarEvents] = useState(() =>
    loadSharedCalendarEvents()
  );
  const [schoolTab, setSchoolTab] = useState<"home" | "materials">("home");

  useEffect(() => {
    const reloadCalendar = () => setSharedCalendarEvents(loadSharedCalendarEvents());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SHARED_CALENDAR_EVENTS_KEY) return;
      reloadCalendar();
    };
    window.addEventListener(SHARED_CALENDAR_UPDATED_EVENT, reloadCalendar);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", reloadCalendar);
    return () => {
      window.removeEventListener(SHARED_CALENDAR_UPDATED_EVENT, reloadCalendar);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", reloadCalendar);
    };
  }, []);

  useEffect(() => {
    if (variant === "school") {
      setSchoolTab("home");
    }
  }, [variant]);

  const heroDisplayName = [profilePlaque.firstName, profilePlaque.lastName].filter(Boolean).join(" ").trim();
  const upcomingEvents = useMemo(
    () => filterEventsForVariant(sharedCalendarEvents, variant),
    [sharedCalendarEvents, variant]
  );
  const isRequestsPage =
    variant === "spo" && location.pathname.startsWith("/cabinet-spo/requests");
  const isPortfolioPage =
    variant === "spo" && location.pathname.startsWith("/cabinet-spo/portfolio");
  const isSchoolMaterialsOnly = variant === "school" && schoolTab === "materials";
  const isSchoolInstituteDark = variant === "school" && isDark;
  const instituteCardDarkBg =
    "linear-gradient(145deg, rgba(36, 59, 116, 0.88) 0%, rgba(31, 52, 102, 0.86) 52%, rgba(26, 42, 82, 0.84) 100%)";
  const institutePanelDarkBg =
    "linear-gradient(152deg, rgba(26, 42, 82, 0.82) 0%, rgba(31, 52, 102, 0.78) 48%, rgba(20, 34, 70, 0.84) 100%)";

  return (
    <main style={layoutStyles.main}>
      <aside style={layoutStyles.aside}>
        <button
          type="button"
          className="softtouch-plaque"
          onClick={() => {
            if (variant === "school") {
              setSchoolTab("home");
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "18px",
            borderRadius: 32,
            background:
              variant === "school" && schoolTab === "home"
                ? styles.plaqueNavActiveBg
                : styles.plaqueButtonBg,
            color:
              variant === "school" && schoolTab === "home"
                ? styles.plaqueNavActiveText
                : styles.plaqueButtonText,
            fontWeight: 700,
            boxShadow: styles.plaqueButtonShadow,
            border: styles.plaqueButtonBorder,
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <CabinetHomeIcon
            size={22}
            color={
              variant === "school" && schoolTab === "home"
                ? styles.plaqueNavActiveText
                : styles.plaqueButtonText
            }
          />
          <span>Главная</span>
          <span
            style={{
              marginLeft: "auto",
              background: styles.plaqueBadgeBg,
              color: styles.plaqueBadgeText,
              fontWeight: 700,
              borderRadius: 9999,
              padding: "6px 14px",
              fontSize: 12,
            }}
          >
            {copy.asideBadge}
          </span>
        </button>
        <div
          style={{
            ...layoutStyles.sideCard,
            background: isSchoolInstituteDark ? institutePanelDarkBg : layoutStyles.sideCard.background,
            border: isSchoolInstituteDark ? "1px solid rgba(167, 188, 242, 0.28)" : layoutStyles.sideCard.border,
          }}
        >
          <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>{copy.sideCardKicker}</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{copy.sideCardTitle}</div>
          <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>{copy.sideCardText}</div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {copy.sideBlocks.map((b) => (
            <button
              key={b.title}
              type="button"
              className="softtouch-plaque"
              onClick={() => {
                if (variant === "school" && b.title === "Материалы и задания") {
                  setSchoolTab("materials");
                  return;
                }
              }}
              style={{
                ...layoutStyles.sideBlock,
                background:
                  variant === "school" && b.title === "Материалы и задания" && schoolTab === "materials"
                    ? styles.plaqueNavActiveBg
                    : isSchoolInstituteDark
                      ? instituteCardDarkBg
                      : layoutStyles.sideBlock.background,
                boxShadow:
                  variant === "school" && b.title === "Материалы и задания" && schoolTab === "materials"
                    ? styles.plaqueButtonShadow
                    : layoutStyles.sideBlock.boxShadow,
                color:
                  variant === "school" && b.title === "Материалы и задания" && schoolTab === "materials"
                    ? styles.plaqueNavActiveText
                    : layoutStyles.sideBlock.color,
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 8,
                  letterSpacing: "-0.01em",
                  color:
                    variant === "school" && b.title === "Материалы и задания" && schoolTab === "materials"
                      ? styles.plaqueNavActiveText
                      : styles.text,
                }}
              >
                {b.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color:
                    variant === "school" && b.title === "Материалы и задания" && schoolTab === "materials"
                      ? isDark
                        ? "rgba(248,250,252,0.9)"
                        : "rgba(248,250,252,0.92)"
                      : styles.plaqueButtonMuted,
                  lineHeight: 1.5,
                }}
              >
                {b.text}
              </div>
            </button>
          ))}
        </div>
      </aside>
      <section style={layoutStyles.section}>
        {isSchoolMaterialsOnly ? (
          <div className="ref-utility-card ref-radius-a" style={{ ...layoutStyles.recentPanel, padding: 24, minHeight: 276 }}>
            <div style={layoutStyles.recentTitle}>Материалы и задания</div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
              Учебные блоки и задания для подготовки к отраслевым мероприятиям.
            </div>
            {[
              {
                title: "Тема: Безопасность дорожного движения",
                meta: "Учебный модуль",
                text: "Изучите материалы и ответьте на контрольные вопросы по теме БДД.",
              },
              {
                title: "Практическое задание: анализ дорожной ситуации",
                meta: "Задание · до 30 апреля",
                text: "Подготовьте краткий разбор предложенного кейса и загрузите ответ в систему.",
              },
              {
                title: "Дополнительные материалы",
                meta: "Подборка",
                text: "Презентации, методички и видеоматериалы от ассоциаций РАДОР и АДО.",
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: 18,
                  borderRadius: 24,
                  background: styles.sectionBg,
                  color: styles.text,
                  boxShadow: styles.insetShadow,
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700 }}>{item.title}</div>
                <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                  {item.meta}
                </div>
                <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
        <div
          className="ref-chip-rail"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: CHIP_WRAP_RADIUS,
            background: styles.cardBg,
            border: styles.tileBorder,
            boxShadow: styles.cardShadow,
            backdropFilter: "blur(18px) saturate(118%)",
            WebkitBackdropFilter: "blur(18px) saturate(118%)",
            width: "fit-content",
            alignSelf: "start",
            justifySelf: "start",
          }}
        >
          {["Новости", "Избранное", "Программы", "Вузы"].map((chip, idx) => (
            <button
              key={chip}
              type="button"
              className="softtouch-chip"
              style={{
                border: "none",
                borderRadius: CHIP_RADIUS,
                minHeight: CHIP_HEIGHT,
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                color: styles.plaqueButtonText,
                background:
                  idx === 0
                    ? `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`
                    : `${styles.plaqueAccentStripe}, ${styles.plaqueButtonBg}`,
                boxShadow: `${styles.insetShadow}`,
              }}
            >
              {chip}
            </button>
          ))}
        </div>
        <div
          className="dashboard-glass-frame ref-stage ref-surface-soft"
          style={{
            padding: 22,
            background: isSchoolInstituteDark
              ? `${styles.plaqueAccentStripe}, ${institutePanelDarkBg}`
              : `${styles.plaqueAccentStripe}, ${styles.sectionBg}`,
            border: styles.panelBorder,
            boxShadow: styles.cardShadow,
            backdropFilter: "blur(26px) saturate(125%)",
            WebkitBackdropFilter: "blur(26px) saturate(125%)",
            display: "grid",
            gap: 22,
          }}
        >
          <div className="dashboard-hero-grid">
            <div className="ref-radius-a" style={{ ...heroCardStyle, minHeight: 404 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" style={layoutStyles.heroTag}>
                {copy.heroTag}
              </button>
              <button
                type="button"
                style={{
                  ...layoutStyles.heroButton,
                  width: 46,
                  height: 46,
                  minWidth: 46,
                  minHeight: 46,
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  decoding="async"
                  src={heroRoleIconSrc}
                  alt=""
                  width={28}
                  height={28}
                  style={{ display: "block", objectFit: "contain" }}
                />
              </button>
            </div>
            {heroDisplayName ? (
              <div style={layoutStyles.heroTitle}>{heroDisplayName}</div>
            ) : (
              <div style={layoutStyles.heroTitleEmpty}>{copy.heroTitleFallback}</div>
            )}
          </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <div
                className="ref-utility-card ref-radius-b ref-overlap-up"
                style={{
                  ...layoutStyles.infoCard,
                  gridColumn: "1 / -1",
                  background: isSchoolInstituteDark ? instituteCardDarkBg : layoutStyles.infoCard.background,
                }}
              >
              <div style={layoutStyles.infoLabel}>{copy.info.label}</div>
              <div
                style={
                  copy.info.title === "Летняя практика и кейсы подрядчиков"
                    ? { ...layoutStyles.infoTitle, fontSize: 22, fontWeight: 700, letterSpacing: "normal" }
                    : { ...layoutStyles.infoTitle, fontSize: "clamp(22px, 2.1vw, 28px)" }
                }
              >
                {copy.info.title}
              </div>
              <div style={layoutStyles.infoText}>{copy.info.text}</div>
            </div>
            {copy.actions.map((a) => (
              <button
                key={a.title}
                type="button"
                onClick={() => {
                  if (variant === "school") {
                    if (a.title === "Объявления и письма") {
                      navigate("/cabinet-school/messages");
                      return;
                    }
                    if (a.title === "Календарь активностей") {
                      navigate("/cabinet-school/calendar");
                      return;
                    }
                    navigate("/cabinet-school");
                    return;
                  }
                  if (a.title === "Портфолио достижений") {
                    navigate("/cabinet-spo/portfolio");
                    return;
                  }
                  navigate("/cabinet-spo/requests");
                }}
                className={`softtouch-plaque ${a.title === copy.actions[0]?.title ? "ref-radius-c ref-overlap-left" : "ref-radius-b ref-overlap-right"}`}
                style={{
                  ...layoutStyles.actionCard,
                  minHeight: 132,
                  display: "flex",
                  flexDirection: "column",
                  background:
                    ((a.title === "Портфолио достижений" && isPortfolioPage) ||
                      (a.title === "Заявки и ответы" && isRequestsPage) ||
                      (a.title !== "Портфолио достижений" &&
                        a.title !== "Заявки и ответы" &&
                        !isPortfolioPage &&
                        !isRequestsPage))
                      ? `${styles.plaqueNavActiveBg}`
                      : isSchoolInstituteDark
                        ? instituteCardDarkBg
                        : layoutStyles.actionCard.background,
                  boxShadow:
                    ((a.title === "Портфолио достижений" && isPortfolioPage) ||
                      (a.title === "Заявки и ответы" && isRequestsPage) ||
                      (a.title !== "Портфолио достижений" &&
                        a.title !== "Заявки и ответы" &&
                        !isPortfolioPage &&
                        !isRequestsPage))
                      ? styles.plaqueButtonShadow
                      : layoutStyles.actionCard.boxShadow,
                  color:
                    ((a.title === "Портфолио достижений" && isPortfolioPage) ||
                      (a.title === "Заявки и ответы" && isRequestsPage) ||
                      (a.title !== "Портфолио достижений" &&
                        a.title !== "Заявки и ответы" &&
                        !isPortfolioPage &&
                        !isRequestsPage))
                      ? styles.plaqueNavActiveText
                      : layoutStyles.actionCard.color,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 8,
                    letterSpacing: "-0.01em",
                    minHeight: 40,
                    display: "flex",
                    alignItems: "flex-start",
                    color:
                      ((a.title === "Портфолио достижений" && isPortfolioPage) ||
                        (a.title === "Заявки и ответы" && isRequestsPage) ||
                        (a.title !== "Портфолио достижений" &&
                          a.title !== "Заявки и ответы" &&
                          !isPortfolioPage &&
                          !isRequestsPage))
                        ? styles.plaqueNavActiveText
                        : styles.text,
                  }}
                >
                  {a.title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      ((a.title === "Портфолио достижений" && isPortfolioPage) ||
                        (a.title === "Заявки и ответы" && isRequestsPage) ||
                        (a.title !== "Портфолио достижений" &&
                          a.title !== "Заявки и ответы" &&
                          !isPortfolioPage &&
                          !isRequestsPage))
                        ? isDark
                          ? "rgba(248,250,252,0.9)"
                          : "rgba(248,250,252,0.92)"
                        : styles.plaqueButtonMuted,
                    lineHeight: 1.5,
                  }}
                >
                  {a.text}
                </div>
              </button>
            ))}
            </div>
          </div>
          <div
            className="ref-utility-card ref-radius-a"
            style={{
              ...layoutStyles.recentPanel,
              padding: 24,
              minHeight: 276,
              background: isSchoolInstituteDark ? institutePanelDarkBg : layoutStyles.recentPanel.background,
            }}
          >
          {variant === "school" && schoolTab === "materials" ? (
            <>
              <div style={layoutStyles.recentTitle}>Материалы и задания</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
                Учебные блоки и задания для подготовки к отраслевым мероприятиям.
              </div>
              {[
                {
                  title: "Тема: Безопасность дорожного движения",
                  meta: "Учебный модуль",
                  text: "Изучите материалы и ответьте на контрольные вопросы по теме БДД.",
                },
                {
                  title: "Практическое задание: анализ дорожной ситуации",
                  meta: "Задание · до 30 апреля",
                  text: "Подготовьте краткий разбор предложенного кейса и загрузите ответ в систему.",
                },
                {
                  title: "Дополнительные материалы",
                  meta: "Подборка",
                  text: "Презентации, методички и видеоматериалы от ассоциаций РАДОР и АДО.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: styles.sectionBg,
                    color: styles.text,
                    boxShadow: styles.insetShadow,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                    {item.meta}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </>
          ) : isPortfolioPage ? (
            <>
              <div style={layoutStyles.recentTitle}>Портфолио достижений</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
                Отмечайте ключевые проекты и мероприятия для резюме и отбора на практику.
              </div>
              {[
                {
                  title: "Кейс: логистика зимнего содержания дорог",
                  meta: "Проект · март 2026",
                  text: "Подготовлен аналитический отчёт и презентация по оптимизации маршрутов уборки.",
                },
                {
                  title: "Отраслевая конференция РАДОР",
                  meta: "Мероприятие · апрель 2026",
                  text: "Участие в секции по цифровым инструментам сопровождения дорожных работ.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: styles.sectionBg,
                    color: styles.text,
                    boxShadow: styles.insetShadow,
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                    {item.meta}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div style={layoutStyles.recentTitle}>Ближайшие мероприятия</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
                {copy.eventsHint}
              </div>
              {upcomingEvents.length === 0 ? (
                <div
                  style={{
                    padding: 18,
                    borderRadius: 24,
                    background: styles.sectionBg,
                    color: styles.muted,
                    boxShadow: styles.insetShadow,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {copy.eventsEmpty}
                </div>
              ) : (
                upcomingEvents.map((ev) => {
                  const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={ev.id}
                      style={{
                        padding: 18,
                        borderRadius: 24,
                        background: styles.sectionBg,
                        color: styles.text,
                        boxShadow: styles.insetShadow,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                        {dateLabel} · {ev.time} · {AUDIENCE_LABELS[ev.audience]}
                      </div>
                      {ev.description ? (
                        <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                          {ev.description.length > 160 ? `${ev.description.slice(0, 160)}…` : ev.description}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </>
          )}
          </div>
        </div>
        <ProforientationTestSection styles={styles} learnerKind={variant} />
          </>
        )}
      </section>
    </main>
  );
}

function CabinetLearnerHome({ variant }: { variant: LearnerCabinetVariant }) {
  const copy = DASHBOARD_COPY[variant];
  const renderDashboard = useCallback(
    (ctx: CabinetChromeContext) => <LearnerCabinetDashboard ctx={ctx} variant={variant} />,
    [variant]
  );

  return (
    <CabinetChromeLayout cabinetPath={copy.cabinetPath}>
      {renderDashboard}
    </CabinetChromeLayout>
  );
}

export default memo(CabinetLearnerHome);
