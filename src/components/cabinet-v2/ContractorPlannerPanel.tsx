import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { ContractorPlannerItem } from "../../utils/contractorDashboardData";

export const CONTRACTOR_PLANNER_PANEL_ID = "contractor-planner-panel";

type Props = {
  panelId?: string;
  compact?: boolean;
  items: ContractorPlannerItem[];
  panelClassName: string;
  onManage?: () => void;
  onItemClick?: (item: ContractorPlannerItem) => void;
  onToggleDone?: (item: ContractorPlannerItem) => void;
};

function PlannerCheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="contractor-planner__check contractor-planner__check--done" aria-hidden>
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path
            d="M3.5 8.2 6.4 11 12.5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return <span className="contractor-planner__check" aria-hidden />;
}

function ContractorPlannerPanel({
  panelId = CONTRACTOR_PLANNER_PANEL_ID,
  compact = false,
  items,
  panelClassName,
  onManage,
  onItemClick,
  onToggleDone,
}: Props) {
  return (
    <section
      id={panelId}
      className={cx(
        "contractor-planner",
        compact && "contractor-planner--compact",
        "cabinet-chrome__recent-panel",
        "pv2-card-l1",
        "pv2-accent-edge",
        panelClassName
      )}
    >
      <header className="contractor-planner__head">
        <div className="contractor-planner__head-main">
          <span className="contractor-planner__icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <rect x="3.5" y="5.5" width="17" height="15" rx="3" stroke="currentColor" strokeWidth="1.75" />
              <path d="M8 3.5v4M16 3.5v4M3.5 10h17" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <div className="contractor-planner__head-text">
            <p className="contractor-planner__kicker">Планнер</p>
            <p className="contractor-planner__lede">Задачи и напоминания</p>
          </div>
        </div>
        {onManage ? (
          <button type="button" className="contractor-planner__manage" onClick={onManage}>
            Управление <span aria-hidden>›</span>
          </button>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="contractor-planner__empty">
          Записей пока нет. Нажмите «Управление», чтобы добавить задачи в календаре.
        </p>
      ) : (
        <ul className="contractor-planner__list">
          {items.map((item) => (
            <li key={item.id}>
              <div
                className={cx(
                  "contractor-planner__row",
                  item.done && "contractor-planner__row--done"
                )}
              >
                <button
                  type="button"
                  className="contractor-planner__check-btn"
                  onClick={() => onToggleDone?.(item)}
                  aria-pressed={item.done}
                  aria-label={item.done ? "Снять отметку" : "Отметить выполненным"}
                >
                  <PlannerCheckIcon done={item.done} />
                </button>
                <button
                  type="button"
                  className="contractor-planner__row-main"
                  onClick={() => onItemClick?.(item)}
                >
                  <span className="contractor-planner__title">{item.title}</span>
                  <span className="contractor-planner__date">{item.dateLabel}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default memo(ContractorPlannerPanel);
