import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import { ROLE_ICON_CONTRACTOR } from "../assets/appIcons";

const CABINET_HERO_CONTRACTOR = new URL("../assets/cabinet-hero-contractor.png", import.meta.url).href;
import HeroRoleIconButton from "../components/HeroRoleIconButton";
import ContractorCabinetDashboardV2 from "../components/cabinet-v2/ContractorCabinetDashboardV2";
import ContractorGlassKpiRow from "../components/cabinet-v2/ContractorGlassKpiRow";
import { CONTRACTOR_UPCOMING_EVENTS_PANEL_ID } from "../components/cabinet-v2/CabinetV2Primitives";
import Page4V2MainRegion from "../components/cabinet-v2/Page4V2MainRegion";
import { cx } from "../design-system/cabinetChromeClasses";
import {
  buildCabinetHeroCardStyle,
  CABINET_HERO_BG_POSITION_CONTRACTOR,
  heroTagBadgeStyle,
  heroTopRowStyle,
} from "../utils/cabinetHero";
import { ContractorCabinetAside } from "../components/ContractorCabinetAside";
import { AUDIENCE_LABELS, getUpcomingStudentSchoolEventsForPanel } from "./AssociationEventsView";
import {
  loadSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
  SHARED_CALENDAR_UPDATED_EVENT,
} from "../utils/sharedCalendarEvents";
import { Page4ContractorProforientationMain } from "./Page4ContractorProforientation";
import ContractorDocumentsView from "./ContractorDocumentsView";
import ContractorStudentTeamsView from "./ContractorStudentTeamsView";
import ContractorRecommendationsView from "./ContractorRecommendationsView";
import ContractorFormsView from "./ContractorFormsView";
import ContractorPlannerView from "./ContractorPlannerView";
import { fetchContractorAssignedForms, fetchContractorFormAlerts } from "../api/formsApi";
import type { FormSubmission, FormTemplate } from "../types/adminForms";
import { loadAdminFormsStore, listContractorAssignments } from "../utils/adminFormsStorage";
import { formatKpiCount, kpiTrendFromCount } from "../utils/kpiCardHelpers";
import {
  countUnreadContractorRecommendations,
  DISTRIBUTION_PROPOSALS_CHANGED,
  loadContractorRecommendations,
  type ContractorRecommendation,
} from "../utils/distributionRecommendations";
import { countUnreadContractorAlerts } from "../utils/formAlertsStorage";
import { isAuthApiEnabled } from "../utils/authMode";
import {
  formNotificationsSupported,
  requestFormNotificationPermission,
} from "../utils/formBrowserNotify";

function ContractorCabinetDashboard({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, profilePlaque, isDark, cn, isV2 } = ctx;
  const location = useLocation();
  const navigate = useNavigate();
  const isDocumentsPage = location.pathname === "/page4/documents";
  const isTeamsPage = location.pathname === "/page4/teams";
  const isRecommendationsPage = location.pathname === "/page4/recommendations";
  const isProforientationPage = location.pathname === "/page4/proforientation";
  const isFormsPage = location.pathname === "/page4/forms";
  const isPlannerPage = location.pathname === "/page4/planner";
  const [sharedCalendarEvents, setSharedCalendarEvents] = useState(() =>
    loadSharedCalendarEvents()
  );
  const [recommendations, setRecommendations] = useState<ContractorRecommendation[]>([]);
  const [formsUnread, setFormsUnread] = useState(0);
  const [assignedTemplates, setAssignedTemplates] = useState<FormTemplate[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [notifyAsked, setNotifyAsked] = useState(false);

  const reloadRecommendations = useCallback(() => {
    const email = profilePlaque.email.trim();
    if (!email) {
      setRecommendations([]);
      return;
    }
    void loadContractorRecommendations(email).then(setRecommendations);
  }, [profilePlaque.email]);

  useEffect(() => {
    reloadRecommendations();
    const onChange = () => reloadRecommendations();
    window.addEventListener(DISTRIBUTION_PROPOSALS_CHANGED, onChange);
    window.addEventListener("trassa-profile-saved", onChange);
    window.addEventListener("focus", onChange);
    const id = window.setInterval(reloadRecommendations, 20_000);
    return () => {
      window.removeEventListener(DISTRIBUTION_PROPOSALS_CHANGED, onChange);
      window.removeEventListener("trassa-profile-saved", onChange);
      window.removeEventListener("focus", onChange);
      window.clearInterval(id);
    };
  }, [reloadRecommendations]);

  const recommendationsUnread = countUnreadContractorRecommendations(
    profilePlaque.email,
    recommendations
  );

  const syncFormAlertsUnreadLocal = useCallback(() => {
    const email = profilePlaque.email.trim().toLowerCase();
    setFormsUnread(email ? countUnreadContractorAlerts(email) : 0);
  }, [profilePlaque.email]);

  const reloadFormAlertsFromApi = useCallback(() => {
    const email = profilePlaque.email.trim().toLowerCase();
    if (!email) {
      setFormsUnread(0);
      return;
    }
    if (!isAuthApiEnabled()) {
      syncFormAlertsUnreadLocal();
      return;
    }
    void fetchContractorFormAlerts().then((r) => {
      if (r.ok) {
        setFormsUnread(r.alerts.filter((a) => !a.read).length);
      } else {
        syncFormAlertsUnreadLocal();
      }
    });
  }, [profilePlaque.email, syncFormAlertsUnreadLocal]);

  const reloadAssignedForms = useCallback(() => {
    const emailNorm = profilePlaque.email.trim().toLowerCase();
    if (!emailNorm) {
      setAssignedTemplates([]);
      setFormSubmissions([]);
      return;
    }
    if (isAuthApiEnabled()) {
      void fetchContractorAssignedForms().then((r) => {
        if (r.ok) {
          setAssignedTemplates(r.templates);
          setFormSubmissions(r.submissions);
        }
      });
      return;
    }
    const store = loadAdminFormsStore();
    const assigned = listContractorAssignments(emailNorm).map((a) => a.templateId);
    setAssignedTemplates(store.templates.filter((t) => t.active && assigned.includes(t.id)));
    setFormSubmissions(
      store.submissions.filter(
        (s) => s.contractorEmailNorm === emailNorm && assigned.includes(s.templateId)
      )
    );
  }, [profilePlaque.email]);

  useEffect(() => {
    reloadAssignedForms();
    const onFormsChange = () => reloadAssignedForms();
    window.addEventListener("trassa-admin-forms-changed", onFormsChange);
    window.addEventListener("trassa-portal-state-synced", onFormsChange);
    window.addEventListener("focus", reloadAssignedForms);
    const id = window.setInterval(reloadAssignedForms, 30_000);
    return () => {
      window.removeEventListener("trassa-admin-forms-changed", onFormsChange);
      window.removeEventListener("trassa-portal-state-synced", onFormsChange);
      window.removeEventListener("focus", reloadAssignedForms);
      window.clearInterval(id);
    };
  }, [reloadAssignedForms]);

  useEffect(() => {
    reloadFormAlertsFromApi();
    const onLocalChange = () => syncFormAlertsUnreadLocal();
    window.addEventListener("trassa-form-alerts-changed", onLocalChange);
    window.addEventListener("trassa-portal-state-synced", onLocalChange);
    window.addEventListener("focus", reloadFormAlertsFromApi);
    const id = window.setInterval(reloadFormAlertsFromApi, 30_000);
    return () => {
      window.removeEventListener("trassa-form-alerts-changed", onLocalChange);
      window.removeEventListener("trassa-portal-state-synced", onLocalChange);
      window.removeEventListener("focus", reloadFormAlertsFromApi);
      window.clearInterval(id);
    };
  }, [reloadFormAlertsFromApi, syncFormAlertsUnreadLocal]);

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

  const contractorHeroTitle = profilePlaque.contractorCompanyName.trim();

  const contractorHeroCardStyle = useMemo(
    () =>
      buildCabinetHeroCardStyle(
        layoutStyles.heroCard,
        CABINET_HERO_CONTRACTOR,
        isDark,
        CABINET_HERO_BG_POSITION_CONTRACTOR
      ),
    [layoutStyles.heroCard, isDark]
  );

  const contractorUpcomingEvents = useMemo(
    () => getUpcomingStudentSchoolEventsForPanel(sharedCalendarEvents, 6),
    [sharedCalendarEvents]
  );

  const openUpcomingEventsPanel = useCallback(() => {
    const panel = document.getElementById(CONTRACTOR_UPCOMING_EVENTS_PANEL_ID);
    if (panel instanceof HTMLDetailsElement) {
      panel.open = true;
    }
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const contractorBentoMetrics = useMemo(() => {
    const events = contractorUpcomingEvents.length;
    return [
      {
        id: "events",
        icon: "calendar" as const,
        label: "Событий в календаре",
        value: formatKpiCount(events),
        trend: kpiTrendFromCount(events),
        subtitle:
          events > 0 ? "Ближайшие из общего календаря" : "Список ниже — пока пуст",
        insightActionLabel: "Показать события",
        onClick: openUpcomingEventsPanel,
      },
      {
        id: "forms",
        icon: "forms" as const,
        label: "Уведомления по формам",
        value: formatKpiCount(formsUnread),
        trend: kpiTrendFromCount(formsUnread),
        subtitle: formsUnread > 0 ? "Требуют просмотра" : "Все таблицы актуальны",
        insightActionLabel: "Открыть формы",
        onClick: () => navigate("/page4/forms"),
      },
      {
        id: "students",
        icon: "students" as const,
        label: "Подборки студентов",
        value: formatKpiCount(recommendationsUnread),
        trend: kpiTrendFromCount(recommendationsUnread),
        subtitle:
          recommendationsUnread > 0 ? "Новые от администратора" : "Все рекомендации просмотрены",
        insightActionLabel: "Открыть подборки",
        onClick: () => navigate("/page4/recommendations"),
      },
      {
        id: "documents",
        icon: "documents" as const,
        label: "Документы",
        value: "→",
        trend: "neutral" as const,
        subtitle: "Письма и файлы от РАДОР",
        insightActionLabel: "Открыть документы",
        onClick: () => navigate("/page4/documents"),
      },
    ];
  }, [contractorUpcomingEvents.length, formsUnread, recommendationsUnread, navigate, openUpcomingEventsPanel]);
  const isPage4Home = location.pathname === "/page4";
  const isPage4V2 = isV2 && location.pathname.startsWith("/page4");

  const contractorV2KpiHeader = (
    <ContractorGlassKpiRow metrics={contractorBentoMetrics} ariaLabel="Ключевые показатели подрядчика" />
  );

  const renderPage4V2Body = (): ReactNode => {
    if (isFormsPage) {
      return (
        <ContractorFormsView
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          isV2
        />
      );
    }
    if (isDocumentsPage) {
      return (
        <ContractorDocumentsView
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          isV2
        />
      );
    }
    if (isRecommendationsPage) {
      return (
        <ContractorRecommendationsView
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isV2
        />
      );
    }
    if (isTeamsPage) {
      return (
        <ContractorStudentTeamsView
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isV2
        />
      );
    }
    if (isPlannerPage) {
      return <ContractorPlannerView cn={ctx.cn} isV2 />;
    }
    if (isProforientationPage) {
      return <Page4ContractorProforientationMain ctx={ctx} />;
    }
    if (isPage4Home) {
      return (
        <ContractorCabinetDashboardV2
          ctx={ctx}
          contractorHeroCardStyle={contractorHeroCardStyle}
          contractorHeroTitle={contractorHeroTitle}
          contractorUpcomingEvents={contractorUpcomingEvents}
          formsUnread={formsUnread}
          recommendationsUnread={recommendationsUnread}
          assignedTemplates={assignedTemplates}
          formSubmissions={formSubmissions}
        />
      );
    }
    return null;
  };

  if (isPage4V2) {
    return (
      <>
        {isPage4Home ? contractorV2KpiHeader : null}
        <Page4V2MainRegion>{renderPage4V2Body()}</Page4V2MainRegion>
      </>
    );
  }

  const instituteCardDarkBg =
    "linear-gradient(145deg, rgba(36, 59, 116, 0.88) 0%, rgba(31, 52, 102, 0.86) 52%, rgba(26, 42, 82, 0.84) 100%)";
  const institutePanelDarkBg =
    "linear-gradient(152deg, rgba(26, 42, 82, 0.82) 0%, rgba(31, 52, 102, 0.78) 48%, rgba(20, 34, 70, 0.84) 100%)";

  if (isFormsPage) {
    return (
      <main className={ctx.cn.main} style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          active="forms"
          recommendationsUnread={recommendationsUnread}
          formsUnread={formsUnread}
        />
        <section className={ctx.cn.section} style={layoutStyles.section}>
          <ContractorFormsView
            styles={styles}
            layoutStyles={layoutStyles}
            cn={ctx.cn}
            isDark={ctx.isDark}
            isV2={ctx.isV2}
          />
        </section>
      </main>
    );
  }

  if (isDocumentsPage) {
    return (
      <main className={ctx.cn.main} style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          active="documents"
          recommendationsUnread={recommendationsUnread}
          formsUnread={formsUnread}
        />
        <section className={ctx.cn.section} style={layoutStyles.section}>
          <ContractorDocumentsView
            styles={styles}
            layoutStyles={layoutStyles}
            cn={ctx.cn}
            isDark={ctx.isDark}
          />
        </section>
      </main>
    );
  }

  if (isRecommendationsPage) {
    return (
      <main className={ctx.cn.main} style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          active="recommendations"
          recommendationsUnread={recommendationsUnread}
          formsUnread={formsUnread}
        />
        <section className={ctx.cn.section} style={layoutStyles.section}>
          <ContractorRecommendationsView styles={styles} layoutStyles={layoutStyles} cn={ctx.cn} />
        </section>
      </main>
    );
  }

  if (isTeamsPage) {
    return (
      <main className={ctx.cn.main} style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          active="teams"
          recommendationsUnread={recommendationsUnread}
          formsUnread={formsUnread}
        />
        <section className={ctx.cn.section} style={layoutStyles.section}>
          <ContractorStudentTeamsView styles={styles} layoutStyles={layoutStyles} cn={ctx.cn} />
        </section>
      </main>
    );
  }

  if (isProforientationPage) {
    return (
      <main className={ctx.cn.main} style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          cn={ctx.cn}
          isDark={ctx.isDark}
          active="proforientation"
          recommendationsUnread={recommendationsUnread}
          formsUnread={formsUnread}
        />
        <Page4ContractorProforientationMain ctx={ctx} />
      </main>
    );
  }

  return (
    <>
      <main className={ctx.cn.main} style={layoutStyles.main}>
      <ContractorCabinetAside
        styles={styles}
        layoutStyles={layoutStyles}
        cn={ctx.cn}
        isDark={ctx.isDark}
        active="home"
        recommendationsUnread={recommendationsUnread}
        formsUnread={formsUnread}
      />
      <section className={cn.section} style={layoutStyles.section}>
        {formsUnread > 0 ? (
          <div
            className={isV2 ? "page4-v2__notice page4-v2__notice--forms" : undefined}
            style={
              isV2
                ? undefined
                : {
                    marginBottom: 16,
                    padding: "14px 18px",
                    borderRadius: 18,
                    background: isDark ? "rgba(86, 6, 29, 0.28)" : "rgba(86, 6, 29, 0.07)",
                    border: `1px solid ${isDark ? "rgba(232, 180, 196, 0.35)" : "rgba(86, 6, 29, 0.22)"}`,
                    color: styles.text,
                    fontSize: 14,
                    lineHeight: 1.5,
                  }
            }
          >
            <strong style={isV2 ? undefined : { color: isDark ? "#e8b4c4" : "#56061D" }}>
              Таблицы:
            </strong>{" "}
            {formsUnread === 1
              ? "есть непрочитанное уведомление"
              : `непрочитанных уведомлений: ${formsUnread}`}{" "}
            — откройте{" "}
            <button
              type="button"
              onClick={() => navigate("/page4/forms")}
              className={
                isV2 ? "page4-v2__inline-link page4-v2__inline-link-btn" : undefined
              }
              style={
                isV2
                  ? undefined
                  : {
                      border: "none",
                      background: "none",
                      padding: 0,
                      color: "inherit",
                      font: "inherit",
                      fontWeight: 700,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }
              }
            >
              «Заполнение таблиц»
            </button>
            .
            {formNotificationsSupported() && Notification.permission === "default" && !notifyAsked ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setNotifyAsked(true);
                    void requestFormNotificationPermission();
                  }}
                  className={
                    isV2
                      ? "page4-v2__inline-link page4-v2__inline-link--muted page4-v2__inline-link-btn page4-v2__inline-link-btn--muted"
                      : undefined
                  }
                  style={
                    isV2
                      ? undefined
                      : {
                          border: "none",
                          background: "none",
                          padding: 0,
                          color: "inherit",
                          font: "inherit",
                          fontWeight: 600,
                          textDecoration: "underline",
                          cursor: "pointer",
                        }
                  }
                >
                  Включить push в браузере
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {recommendationsUnread > 0 ? (
          <div
            className={isV2 ? "page4-v2__notice page4-v2__notice--recommendations" : undefined}
            style={
              isV2
                ? undefined
                : {
                    marginBottom: 16,
                    padding: "14px 18px",
                    borderRadius: 18,
                    background: isDark ? "rgba(198, 40, 40, 0.22)" : "rgba(198, 40, 40, 0.08)",
                    border: `1px solid ${isDark ? "rgba(255, 180, 180, 0.35)" : "rgba(198, 40, 40, 0.25)"}`,
                    color: styles.text,
                    fontSize: 14,
                    lineHeight: 1.5,
                  }
            }
          >
            <strong>Новая подборка студентов.</strong> Администратор рекомендовал вам{" "}
            {recommendationsUnread}{" "}
            {recommendationsUnread === 1
              ? "студента"
              : recommendationsUnread < 5
                ? "студентов"
                : "студентов"}{" "}
            — откройте раздел{" "}
            <button
              type="button"
              onClick={() => navigate("/page4/recommendations")}
              className={isV2 ? "page4-v2__inline-link" : undefined}
              style={{
                border: "none",
                background: "none",
                padding: 0,
                color: "inherit",
                font: "inherit",
                fontWeight: 700,
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              «Студенты»
            </button>
            .
          </div>
        ) : null}
        <div
          className={cx(
            "dashboard-glass-frame",
            "ref-stage",
            "ref-surface-soft",
            isV2 && "cabinet-bento-shell",
            isV2 && "page4-v2__dashboard"
          )}
          style={{
            padding: 22,
            background: isDark
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
            <div className={cx("ref-radius-a", "cabinet-hero-plaque", cn.hero)} style={contractorHeroCardStyle}>
            <div style={heroTopRowStyle}>
              <div style={heroTagBadgeStyle(layoutStyles.heroTag)}>Письма, практика и обучение</div>
              <HeroRoleIconButton
                iconSrc={ROLE_ICON_CONTRACTOR}
                buttonBaseStyle={layoutStyles.heroButton}
              />
            </div>
            {contractorHeroTitle ? (
              <div style={layoutStyles.heroTitle}>{contractorHeroTitle}</div>
            ) : (
              <div style={layoutStyles.heroTitleEmpty}>
                Укажите наименование организации в настройках профиля — оно появится здесь.
              </div>
            )}
          </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
              <div
                className={cx("ref-utility-card", "ref-radius-b", "ref-overlap-up", cn.infoCard)}
                style={{
                  ...layoutStyles.infoCard,
                  gridColumn: "1 / -1",
                  background: isDark ? instituteCardDarkBg : layoutStyles.infoCard.background,
                }}
              >
              <div style={layoutStyles.infoLabel}>письмо от Ассоциации «РАДОР»</div>
              <div style={{ ...layoutStyles.infoTitle, fontSize: "clamp(22px, 2.1vw, 28px)" }}>
                Запрос на летнюю практику 2026
              </div>
              <div style={layoutStyles.infoText}>
                Подрядчик может редактировать письмо и структуру таблицы. Может просматривать, готовить ответ и загружать
                сопровождающие файлы в существующих шаблонах таблиц.
              </div>
            </div>
            <button
              type="button"
                className={cx("softtouch-plaque", "ref-radius-c", "ref-overlap-left", isV2 && "page4-v2__action-tile")}
                style={{
                  ...layoutStyles.actionCard,
                  minHeight: 132,
                  display: "flex",
                  flexDirection: "column",
                  background: isDark ? instituteCardDarkBg : layoutStyles.actionCard.background,
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
                }}
              >
                Письма и уведомления
              </div>
              <div style={{ fontSize: 13, color: styles.plaqueButtonMuted, lineHeight: 1.5 }}>
                Открыть список писем и увидеть последние запросы.
              </div>
            </button>
            <button
              type="button"
                className={cx("softtouch-plaque", "ref-radius-b", "ref-overlap-right", isV2 && "page4-v2__action-tile")}
                style={{
                  ...layoutStyles.actionCard,
                  minHeight: 132,
                  display: "flex",
                  flexDirection: "column",
                  background: isDark ? instituteCardDarkBg : layoutStyles.actionCard.background,
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
                }}
              >
                Таблица практики
              </div>
              <div style={{ fontSize: 13, color: styles.plaqueButtonMuted, lineHeight: 1.5 }}>
                Открыть таблицу, которую администратор может редактировать и наполнять.
              </div>
            </button>
            </div>
          </div>
          <div
            className={cx("ref-utility-card", "ref-radius-a", cn.recentPanel)}
            style={{
              ...layoutStyles.recentPanel,
              padding: 24,
              minHeight: 276,
              background: isDark ? institutePanelDarkBg : layoutStyles.recentPanel.background,
            }}
          >
          <div className={cn.recentTitle} style={layoutStyles.recentTitle}>
            Ближайшие мероприятия
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 4 }}>
            Мероприятия для студентов и школьников, которые создают ассоциации РАДОР и АДО во вкладке «Мероприятия».
          </div>
          {contractorUpcomingEvents.length === 0 ? (
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
              Пока нет запланированных мероприятий для студентов и школьников. Когда РАДОР или АДО добавят события с
              такой аудиторией, они появятся здесь.
            </div>
          ) : (
            contractorUpcomingEvents.map((ev) => {
              const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <div
                  key={ev.id}
                  className={isV2 ? "page4-v2__event-card" : undefined}
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
          </div>
        </div>
      </section>
    </main>
    </>
  );
}

const ContractorCabinetPage = () => {
  const renderDashboard = useCallback((ctx: CabinetChromeContext) => <ContractorCabinetDashboard ctx={ctx} />, []);

  return (
    <CabinetChromeLayout cabinetPath="/page4">
      {renderDashboard}
    </CabinetChromeLayout>
  );
};

export default memo(ContractorCabinetPage);
