import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CabinetChromeLayout, { type CabinetChromeContext } from "../components/CabinetChromeLayout";
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

function SchoolCalendarPage({ ctx }: { ctx: CabinetChromeContext }) {
  const { styles, layoutStyles } = ctx;
  const navigate = useNavigate();
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

  const events = useMemo(
    () =>
      getUpcomingEventsForPanel(
        sharedCalendarEvents.filter((ev) => ev.audience === "schools"),
        8
      ),
    [sharedCalendarEvents]
  );

  return (
    <main style={layoutStyles.main}>
      <aside style={layoutStyles.aside}>
        <div style={layoutStyles.sideCard}>
          <div style={{ fontSize: 12, color: styles.muted, marginBottom: 10 }}>Раздел школьника</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Календарь активностей</div>
          <div style={{ fontSize: 14, color: styles.muted, lineHeight: 1.7 }}>
            Отдельная страница расписания школьных мероприятий, олимпиад и отраслевых встреч.
          </div>
        </div>
        <button
          type="button"
          className="softtouch-plaque"
          onClick={() => navigate("/cabinet-school")}
          style={layoutStyles.sideBlock}
        >
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Вернуться в кабинет</div>
          <div style={{ fontSize: 13, color: styles.plaqueButtonMuted, lineHeight: 1.5 }}>
            Открыть главную страницу школьника.
          </div>
        </button>
      </aside>

      <section style={layoutStyles.section}>
        <div style={{ ...layoutStyles.recentPanel, padding: 24 }}>
          <div style={layoutStyles.recentTitle}>Календарь активностей</div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: styles.muted, marginTop: -8, marginBottom: 8 }}>
            Мероприятия для аудитории «Школьники», опубликованные ассоциациями РАДОР и АДО.
          </div>
          {events.length === 0 ? (
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
              Пока нет запланированных мероприятий. Когда появятся новые события, они отобразятся здесь.
            </div>
          ) : (
            events.map((ev) => {
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
                    marginTop: 12,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: styles.muted, fontWeight: 600 }}>
                    {dateLabel} · {ev.time} · {AUDIENCE_LABELS[ev.audience]}
                  </div>
                  {ev.description ? (
                    <div style={{ fontSize: 13, marginTop: 8, color: styles.muted, lineHeight: 1.45 }}>
                      {ev.description}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

const CabinetSchoolCalendar = () => {
  const render = useCallback((ctx: CabinetChromeContext) => <SchoolCalendarPage ctx={ctx} />, []);
  return <CabinetChromeLayout cabinetPath="/cabinet-school">{render}</CabinetChromeLayout>;
};

export default memo(CabinetSchoolCalendar);

