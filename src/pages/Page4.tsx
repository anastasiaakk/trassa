import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
import { CABINET_HERO_CONTRACTOR, ROLE_ICON_CONTRACTOR } from "../assets/appIcons";
import HeroRoleIconButton from "../components/HeroRoleIconButton";
import { buildCabinetHeroCardStyle, heroTopRowStyle } from "../utils/cabinetHero";
import { ContractorCabinetAside } from "../components/ContractorCabinetAside";
import { AUDIENCE_LABELS, getUpcomingStudentSchoolEventsForPanel } from "./Page5EventsView";
import {
  loadSharedCalendarEvents,
  SHARED_CALENDAR_EVENTS_KEY,
  SHARED_CALENDAR_UPDATED_EVENT,
} from "../utils/sharedCalendarEvents";
import { Page4ContractorProforientationMain } from "./Page4ContractorProforientation";
import ContractorDocumentsView from "./ContractorDocumentsView";
import ContractorStudentTeamsView from "./ContractorStudentTeamsView";

function ContractorCabinetDashboard({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles, profilePlaque, isDark } = ctx;
  const location = useLocation();
  const isDocumentsPage = location.pathname === "/page4/documents";
  const isTeamsPage = location.pathname === "/page4/teams";
  const isProforientationPage = location.pathname === "/page4/proforientation";
  const [sharedCalendarEvents, setSharedCalendarEvents] = useState(() =>
    loadSharedCalendarEvents()
  );

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
    () => buildCabinetHeroCardStyle(layoutStyles.heroCard, CABINET_HERO_CONTRACTOR, isDark),
    [layoutStyles.heroCard, isDark]
  );

  const contractorUpcomingEvents = useMemo(
    () => getUpcomingStudentSchoolEventsForPanel(sharedCalendarEvents, 6),
    [sharedCalendarEvents]
  );
  const instituteCardDarkBg =
    "linear-gradient(145deg, rgba(36, 59, 116, 0.88) 0%, rgba(31, 52, 102, 0.86) 52%, rgba(26, 42, 82, 0.84) 100%)";
  const institutePanelDarkBg =
    "linear-gradient(152deg, rgba(26, 42, 82, 0.82) 0%, rgba(31, 52, 102, 0.78) 48%, rgba(20, 34, 70, 0.84) 100%)";

  if (isDocumentsPage) {
    return (
      <main style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          isDark={ctx.isDark}
          active="documents"
        />
        <section style={layoutStyles.section}>
          <ContractorDocumentsView styles={styles} layoutStyles={layoutStyles} isDark={ctx.isDark} />
        </section>
      </main>
    );
  }

  if (isTeamsPage) {
    return (
      <main style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          isDark={ctx.isDark}
          active="teams"
        />
        <section style={layoutStyles.section}>
          <ContractorStudentTeamsView styles={styles} layoutStyles={layoutStyles} />
        </section>
      </main>
    );
  }

  if (isProforientationPage) {
    return (
      <main style={layoutStyles.main}>
        <ContractorCabinetAside
          styles={styles}
          layoutStyles={layoutStyles}
          isDark={ctx.isDark}
          active="proforientation"
        />
        <Page4ContractorProforientationMain ctx={ctx} />
      </main>
    );
  }

  return (
    <main style={layoutStyles.main}>
      <ContractorCabinetAside
        styles={styles}
        layoutStyles={layoutStyles}
        isDark={ctx.isDark}
        active="home"
      />
      <section style={layoutStyles.section}>
        <div
          className="dashboard-glass-frame ref-stage ref-surface-soft"
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
            <div className="ref-radius-a" style={{ ...contractorHeroCardStyle, minHeight: 404 }}>
            <div style={heroTopRowStyle}>
              <button type="button" style={{ ...layoutStyles.heroTag, flexShrink: 1, minWidth: 0 }}>
                Письма, практика и обучение
              </button>
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
                className="ref-utility-card ref-radius-b ref-overlap-up"
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
                className="softtouch-plaque ref-radius-c ref-overlap-left"
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
                className="softtouch-plaque ref-radius-b ref-overlap-right"
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
            className="ref-utility-card ref-radius-a"
            style={{
              ...layoutStyles.recentPanel,
              padding: 24,
              minHeight: 276,
              background: isDark ? institutePanelDarkBg : layoutStyles.recentPanel.background,
            }}
          >
          <div style={layoutStyles.recentTitle}>Ближайшие мероприятия</div>
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
  );
}

const Page4 = () => {
  const renderDashboard = useCallback((ctx: CabinetChromeContext) => <ContractorCabinetDashboard ctx={ctx} />, []);

  return (
    <CabinetChromeLayout cabinetPath="/page4">
      {renderDashboard}
    </CabinetChromeLayout>
  );
};

export default memo(Page4);
