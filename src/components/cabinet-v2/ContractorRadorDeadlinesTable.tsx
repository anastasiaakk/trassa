import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { RadorDeadlineTableRow } from "../../utils/contractorDashboardData";

export const CONTRACTOR_RADOR_DEADLINES_PANEL_ID = "contractor-rador-deadlines-panel";

type Props = {
  panelId?: string;
  compact?: boolean;
  rows: RadorDeadlineTableRow[];
  panelClassName: string;
  onManage: () => void;
  onRowClick?: (row: RadorDeadlineTableRow) => void;
};

function StatusBadge({ row }: { row: RadorDeadlineTableRow }) {
  return (
    <span
      className={cx(
        "contractor-rador-deadlines__status",
        row.status === "submitted" && "contractor-rador-deadlines__status--submitted",
        row.status === "overdue" && "contractor-rador-deadlines__status--overdue",
        row.status === "in_progress" && "contractor-rador-deadlines__status--progress",
        row.status === "no_deadline" && "contractor-rador-deadlines__status--muted"
      )}
    >
      {row.status === "submitted" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.18" />
          <path
            d="M4.5 8.2 6.8 10.5 11.5 5.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : row.status === "overdue" ? (
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4.5v4l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}
      {row.statusLabel}
    </span>
  );
}

function ContractorRadorDeadlinesTable({
  panelId = CONTRACTOR_RADOR_DEADLINES_PANEL_ID,
  compact = false,
  rows,
  panelClassName,
  onManage,
  onRowClick,
}: Props) {
  return (
    <section
      id={panelId}
      className={cx(
        "contractor-rador-deadlines",
        compact && "contractor-rador-deadlines--compact",
        "cabinet-chrome__recent-panel",
        "pv2-card-l1",
        "pv2-accent-edge",
        panelClassName
      )}
    >
      <header className="contractor-rador-deadlines__head">
        <div className="contractor-rador-deadlines__head-main">
          <span className="contractor-rador-deadlines__icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M5 6.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path d="M8 4.5v4M16 4.5v4M5 11h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              <circle cx="9" cy="15.5" r="1.25" fill="currentColor" />
              <circle cx="15" cy="15.5" r="1.25" fill="currentColor" />
            </svg>
          </span>
          <div className="contractor-rador-deadlines__head-text">
            <p className="contractor-rador-deadlines__kicker">Дедлайны таблиц РАДОР</p>
            <p className="contractor-rador-deadlines__lede">Сроки и статус заполнения</p>
          </div>
        </div>
        <button type="button" className="contractor-rador-deadlines__manage" onClick={onManage}>
          Управление <span aria-hidden>›</span>
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="contractor-rador-deadlines__empty">
          РАДОР пока не назначил таблицы с дедлайнами.
        </p>
      ) : (
        <div className="contractor-rador-deadlines__table-wrap">
          <table className="contractor-rador-deadlines__table">
            <thead>
              <tr>
                <th>Таблица</th>
                <th>Срок</th>
                <th>Заполнение</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.templateId}>
                  <td>
                    <button
                      type="button"
                      className="contractor-rador-deadlines__name"
                      onClick={() => onRowClick?.(row)}
                    >
                      {row.title}
                    </button>
                  </td>
                  <td>{row.dueLabel}</td>
                  <td>{row.status === "submitted" ? "100%" : `${row.fillPercent}%`}</td>
                  <td>
                    <StatusBadge row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default memo(ContractorRadorDeadlinesTable);
