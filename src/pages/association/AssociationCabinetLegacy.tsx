import { memo, useCallback, useMemo, type CSSProperties } from "react";
import { AiChatBubble } from "../../components/AiChatBubble";
import { FloatingNotes } from "../../components/FloatingNotes";
import { getHoverTooltipPreset, HoverTooltip } from "../../components/HoverTooltip";
import { ProforientationResultsTable } from "../../components/ProforientationEmployerPanels";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { useAssociationCabinetState } from "../../hooks/useAssociationCabinetState";
import {
  ADMIN_CABINET_SEARCH,
  clearAdminReturnMark,
  shouldShowReturnToAdminDashboard,
} from "../../utils/adminReturnNavigation";
import { navigateToProfileSettings } from "../../utils/profileNavigation";
import {
  MESSENGER_PEERS_KEY,
  MESSENGER_STORE_KEY,
  saveMessengerStore,
} from "../../utils/messengerStorage";
import {
  APP_LOGO_SRC,
  ICON_AVATAR,
  ICON_LOGOUT,
  ICON_PROFILE_CHEVRON,
  ICON_SEARCH,
  ICON_THEME,
} from "../../assets/appIcons";
import { AUDIENCE_LABELS, AssociationEventsView } from "../AssociationEventsView";
import { CabinetMessengerView } from "../CabinetMessengerView";
import AssociationDocumentsView from "../AssociationDocumentsView";
import AssociationIncomingDocumentsView from "../AssociationIncomingDocumentsView";
import AssociationStudentTeamsView from "../AssociationStudentTeamsView";
import RadorFormsHub from "../RadorFormsHub";

type AssociationState = ReturnType<typeof useAssociationCabinetState>;

type Props = AssociationState;

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

function AssociationCabinetLegacy({
  variant,
  navigate,
  location,
  basePath,
  associationCopy,
  theme,
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
  plaqueName,
}: Props) {
  const sidebarTooltipPreset = useMemo(() => getHoverTooltipPreset(isDark), [isDark]);

  const legacyCardAccentStyle = useCallback(
    (accent: string): CSSProperties => ({ "--p5l-card-accent": accent }) as CSSProperties,
    []
  );

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: styles.pageBg,
        color: styles.text,
        fontFamily: "var(--font-ui)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
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
                  <img decoding="async" src={ICON_THEME} alt="" className="page5-legacy__icon-22" />
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
                <span className="page5-legacy__profile-name">{plaqueName}</span>
                <img decoding="async" src={ICON_PROFILE_CHEVRON} alt="" className="page5-legacy__icon-16" />
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

        <nav className="page5-legacy__nav" aria-label="Разделы кабинета">
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

        {cabinetSection === "events" ? (
          <main className="page5-legacy__main-region">
            <AssociationEventsView
              styles={styles}
              isDark={isDark}
              events={calendarEvents}
              onEventsChange={setCalendarEvents}
            />
          </main>
        ) : cabinetSection === "messenger" ? (
          <main className="page5-legacy__main-region">
            <CabinetMessengerView
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
                                {ev.description.length > 120
                                  ? `${ev.description.slice(0, 120)}…`
                                  : ev.description}
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
        )}
      </div>
      <FloatingNotes isDark={isDark} />
      <AiChatBubble isDark={isDark} />
    </div>
  );
}

export default memo(AssociationCabinetLegacy);
