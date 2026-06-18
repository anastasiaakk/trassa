import { memo, useMemo, type CSSProperties } from "react";
import { matchesCabinetSearch } from "../../utils/cabinetSearchFilter";
import { useNavigate } from "react-router-dom";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { CabinetChromeClassNames } from "../../design-system/cabinetChromeClasses";
import { getHoverTooltipPreset, HoverTooltip } from "../HoverTooltip";
import {
  AUDIENCE_LABELS,
  type CalendarEventItem,
} from "../../pages/AssociationEventsView";

export type AssociationPageCard = {
  title: string;
  description: string;
  icon: string;
  accent: string;
  accentSoft: string;
  tag: string;
};

type Props = {
  basePath: string;
  badgeTitle: string;
  introParagraph: string;
  filteredCards: AssociationPageCard[];
  upcomingEvents: CalendarEventItem[];
  calendarEvents: CalendarEventItem[];
  onCalendarEventsChange: (events: CalendarEventItem[]) => void;
  cn: CabinetChromeClassNames;
  isDark: boolean;
  isProforientationRoute: boolean;
  leaveProforientationPath: () => void;
  setCabinetSection: (s: "dashboard" | "events" | "messenger") => void;
  sidebarTooltipPreset: ReturnType<typeof getHoverTooltipPreset>;
  normalizedSearch?: string;
};

function formatEventMeta(ev: CalendarEventItem): string {
  const dateLabel = new Date(`${ev.date}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${dateLabel} · ${ev.time} · ${AUDIENCE_LABELS[ev.audience]}`;
}

function AssociationCabinetDashboardV2({
  basePath,
  badgeTitle,
  introParagraph,
  filteredCards,
  upcomingEvents,
  calendarEvents,
  onCalendarEventsChange,
  cn,
  isDark,
  isProforientationRoute,
  leaveProforientationPath,
  setCabinetSection,
  sidebarTooltipPreset,
  normalizedSearch = "",
}: Props) {
  const navigate = useNavigate();

  const visibleEvents = useMemo(
    () =>
      upcomingEvents.filter((ev) =>
        matchesCabinetSearch(normalizedSearch, ev.title, ev.description, ev.date, ev.time)
      ),
    [upcomingEvents, normalizedSearch]
  );

  const openCard = (title: string) => {
    leaveProforientationPath();
    if (title === "Мероприятия") {
      setCabinetSection("events");
    } else if (title === "Студенческие дорожные команды") {
      navigate(`${basePath}/teams`);
    } else if (title === "Документы") {
      navigate(`${basePath}/documents`);
    } else if (title === "Таблицы подрядчиков") {
      navigate(`${basePath}/forms`);
    }
  };

  return (
    <main className={cx("page5-v2-dashboard", "cabinet-v2-main-grid--dashboard")}>
      <div className="cabinet-v2-dashboard__context-strip" aria-label="Контекст кабинета">
        <p className="cabinet-v2-dashboard__context-kicker">{badgeTitle}</p>
        <p className="cabinet-v2-dashboard__context-lede">{introParagraph}</p>
      </div>

      <div className="page5-v2-dashboard__grid">
        <div className="page5-v2-dashboard__cards">
          {filteredCards.map((card) => (
            <article
              key={card.title}
              className="page5-v2__section-card pv2-card-l2 pv2-accent-edge"
              style={
                {
                  background: card.accentSoft,
                  "--pv2-card-accent": card.accent,
                } as CSSProperties
              }
            >
              <span
                className="page5-v2__card-accent"
                style={{ background: card.accent }}
                aria-hidden
              />
              <div className="page5-v2__card-body">
                <div className="page5-v2__card-head">
                  <span className="page5-v2__card-tag">{card.tag}</span>
                  <div className="page5-v2__card-icon">{card.icon}</div>
                </div>
                <h2 className="page5-v2__card-title">{card.title}</h2>
                <p className="page5-v2__card-desc">{card.description}</p>
              </div>
              <div className="page5-v2__card-footer">
                <button
                  type="button"
                  className="page5-v2__card-open"
                  onClick={() => openCard(card.title)}
                >
                  Открыть
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="page5-v2-dashboard__widgets">
          <div className="page5-v2-dashboard__gauge pv2-card-l2">
            <h3 className="page5-v2-dashboard__gauge-title">Приволжский федеральный округ</h3>
            <p className="page5-v2-dashboard__gauge-meta">Ответил на 3 из 4 запросов</p>
            <div className="page5-v2-dashboard__gauge-track" aria-hidden>
              <div className="page5-v2-dashboard__gauge-fill" style={{ width: "84%" }} />
            </div>
            <p className="page5-v2-dashboard__gauge-pct">84% исполнения</p>
          </div>

          <section className={cx("cabinet-v2-dashboard__events", "cabinet-chrome__recent-panel", cn.recentPanel)}>
            <h2 className={cn.recentTitle}>Ближайшие мероприятия</h2>
            <p className="cabinet-v2-dashboard__events-hint">
              Созданные мероприятия отображаются здесь и в разделе «Мероприятия».
            </p>
            {visibleEvents.length === 0 ? (
              <p className="cabinet-v2-dashboard__empty">
                Созданных мероприятий пока нет. Добавьте их во вкладке «Мероприятия» — они появятся здесь.
              </p>
            ) : (
              visibleEvents.map((ev) => (
                <article key={ev.id} className="cabinet-v2-dashboard__event page5-v2-dashboard__event-row">
                  <button
                    type="button"
                    onClick={() => {
                      leaveProforientationPath();
                      setCabinetSection("events");
                    }}
                    className="page5-v2-dashboard__event-link"
                  >
                    <h3 className="cabinet-v2-dashboard__event-title">{ev.title}</h3>
                    <p className="cabinet-v2-dashboard__event-meta">{formatEventMeta(ev)}</p>
                    {ev.description ? (
                      <p className="cabinet-v2-dashboard__event-desc">
                        {ev.description.length > 120 ? `${ev.description.slice(0, 120)}…` : ev.description}
                      </p>
                    ) : null}
                  </button>
                  <HoverTooltip
                    preset={sidebarTooltipPreset}
                    isDark={isDark}
                    content={<span className="page5-v2-dashboard__tooltip-nowrap">Отменить мероприятие</span>}
                  >
                    <button
                      type="button"
                      aria-label="Отменить мероприятие"
                      onClick={() =>
                        onCalendarEventsChange(
                          calendarEvents.map((row) =>
                            row.id === ev.id ? { ...row, cancelled: true } : row
                          )
                        )
                      }
                      className="page5-v2-dashboard__event-cancel"
                    >
                      ×
                    </button>
                  </HoverTooltip>
                </article>
              ))
            )}
          </section>

          <button
            type="button"
            className={cx(
              "page5-v2-dashboard__proforientation",
              isProforientationRoute && "page5-v2-dashboard__proforientation--active"
            )}
            onClick={() => navigate(`${basePath}/proforientation`)}
          >
            <div className="page5-v2-dashboard__proforientation-kicker">
              ПРОФОРИЕНТАЦИЯ
            </div>
            <div className="page5-v2-dashboard__proforientation-title">Результаты теста</div>
            <div className="page5-v2-dashboard__proforientation-desc">
              Школьники и студенты — открыть отчёт →
            </div>
          </button>
        </aside>
      </div>
    </main>
  );
}

export default memo(AssociationCabinetDashboardV2);
