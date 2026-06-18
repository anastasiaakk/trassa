import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cx } from "../design-system/cabinetChromeClasses";
import type { CabinetChromeClassNames } from "../design-system/cabinetChromeClasses";
import Page4V2PageContent from "../components/cabinet-v2/Page4V2PageContent";
import { loadProfileSettings } from "../profileSettingsStorage";
import {
  addPlannerEntry,
  CONTRACTOR_PLANNER_UPDATED_EVENT,
  countPlannerEntriesByDate,
  deletePlannerEntry,
  listPlannerEntries,
  listPlannerEntriesForDate,
  parseDateKey,
  toDateKey,
  togglePlannerEntryDone,
  type ContractorPlannerEntry,
} from "../utils/contractorPlannerStorage";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
] as const;

function buildMonthCells(year: number, month: number): { key: string; day: number | null }[] {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { key: string; day: number | null }[] = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ key: `pad-${year}-${month}-${i}`, day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ key, day: d });
  }
  return cells;
}

type Props = {
  cn?: CabinetChromeClassNames;
  isV2?: boolean;
};

const ContractorPlannerView = memo(function ContractorPlannerView({ cn, isV2 = true }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const emailNorm = loadProfileSettings().email.trim().toLowerCase();

  const initialDay = searchParams.get("day") ?? toDateKey(new Date());
  const [viewYear, setViewYear] = useState(() => parseDateKey(initialDay).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDateKey(initialDay).getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDay);
  const [entries, setEntries] = useState<ContractorPlannerEntry[]>([]);
  const [draftTitle, setDraftTitle] = useState("");

  const reload = useCallback(() => {
    if (!emailNorm) {
      setEntries([]);
      return;
    }
    setEntries(listPlannerEntries(emailNorm));
  }, [emailNorm]);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener(CONTRACTOR_PLANNER_UPDATED_EVENT, onChange);
    window.addEventListener("trassa-profile-saved", onChange);
    return () => {
      window.removeEventListener(CONTRACTOR_PLANNER_UPDATED_EVENT, onChange);
      window.removeEventListener("trassa-profile-saved", onChange);
    };
  }, [reload]);

  const countsByDate = useMemo(() => {
    void entries;
    return countPlannerEntriesByDate(emailNorm);
  }, [emailNorm, entries]);

  const monthCells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const dayEntries = useMemo(() => {
    void entries;
    return listPlannerEntriesForDate(emailNorm, selectedDate);
  }, [emailNorm, selectedDate, entries]);

  const selectDay = (dateKey: string) => {
    setSelectedDate(dateKey);
    setSearchParams({ day: dateKey }, { replace: true });
    const d = parseDateKey(dateKey);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleAdd = () => {
    if (!emailNorm) return;
    const created = addPlannerEntry(emailNorm, selectedDate, draftTitle);
    if (!created) return;
    setDraftTitle("");
    reload();
  };

  const todayKey = toDateKey(new Date());

  const body = !emailNorm ? (
    <p className="contractor-planner-page__empty">
      Укажите e-mail в настройках профиля, чтобы вести планнер.
    </p>
  ) : (
    <div className="contractor-planner-page">
      <section className="contractor-planner-page__calendar pv2-card-l2">
        <header className="contractor-planner-page__cal-head">
          <button type="button" className="contractor-planner-page__nav" onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <h3 className="contractor-planner-page__month">
            {MONTHS[viewMonth]} {viewYear}
          </h3>
          <button type="button" className="contractor-planner-page__nav" onClick={() => shiftMonth(1)}>
            ›
          </button>
        </header>
        <div className="contractor-planner-page__weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="contractor-planner-page__grid">
          {monthCells.map((cell) => {
            if (cell.day === null) {
              return <span key={cell.key} className="contractor-planner-page__cell contractor-planner-page__cell--empty" />;
            }
            const count = countsByDate[cell.key] ?? 0;
            const isSelected = cell.key === selectedDate;
            const isToday = cell.key === todayKey;
            return (
              <button
                key={cell.key}
                type="button"
                className={cx(
                  "contractor-planner-page__cell",
                  isSelected && "contractor-planner-page__cell--selected",
                  isToday && "contractor-planner-page__cell--today"
                )}
                onClick={() => selectDay(cell.key)}
              >
                <span className="contractor-planner-page__day-num">{cell.day}</span>
                {count > 0 ? (
                  <span className="contractor-planner-page__dot" aria-label={`${count} записей`}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="contractor-planner-page__day pv2-card-l2">
        <header className="contractor-planner-page__day-head">
          <h3 className="contractor-planner-page__day-title">
            {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("ru-RU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h3>
        </header>

        <form
          className="contractor-planner-page__add"
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd();
          }}
        >
          <input
            className="contractor-planner-page__input"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Новая запись на этот день"
            maxLength={200}
          />
          <button type="submit" className="contractor-planner-page__add-btn" disabled={!draftTitle.trim()}>
            Добавить
          </button>
        </form>

        {dayEntries.length === 0 ? (
          <p className="contractor-planner-page__empty">На этот день записей пока нет.</p>
        ) : (
          <ul className="contractor-planner-page__list">
            {dayEntries.map((entry) => (
              <li key={entry.id} className="contractor-planner-page__item">
                <button
                  type="button"
                  className={cx(
                    "contractor-planner-page__check",
                    entry.done && "contractor-planner-page__check--done"
                  )}
                  onClick={() => {
                    togglePlannerEntryDone(emailNorm, entry.id);
                    reload();
                  }}
                  aria-label={entry.done ? "Снять отметку" : "Отметить выполненным"}
                />
                <span
                  className={cx(
                    "contractor-planner-page__item-title",
                    entry.done && "contractor-planner-page__item-title--done"
                  )}
                >
                  {entry.title}
                </span>
                <button
                  type="button"
                  className="contractor-planner-page__delete"
                  onClick={() => {
                    deletePlannerEntry(emailNorm, entry.id);
                    reload();
                  }}
                  aria-label="Удалить"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );

  if (!isV2) {
    return (
      <div style={{ padding: 24 }}>
        <button type="button" onClick={() => navigate("/page4")}>
          ← В кабинет
        </button>
        <h2>Планнер</h2>
        {body}
      </div>
    );
  }

  return (
    <Page4V2PageContent
      cn={cn}
      title="Планнер"
      lede="Добавляйте задачи на любой день. Записи видны только в вашем кабинете."
    >
      {body}
    </Page4V2PageContent>
  );
});

export default ContractorPlannerView;
