import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import type {
  ContractorFormProgressRow,
  ContractorStudentStatusRow,
} from "../../utils/contractorDashboardData";
import ContractorGlassKpiRow from "./ContractorGlassKpiRow";

type MonitoringKpi = {
  id: string;
  label: string;
  value: string;
  subtitle: string;
};

type Props = {
  kpis: MonitoringKpi[];
  formProgress: ContractorFormProgressRow[];
  studentStatuses: ContractorStudentStatusRow[];
  onOpenForms: () => void;
  onOpenStudents: () => void;
};

function ContractorDashboardMonitoringPanel({
  kpis,
  formProgress,
  studentStatuses,
  onOpenForms,
  onOpenStudents,
}: Props) {
  const metrics = kpis.map((kpi, index) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    subtitle: kpi.subtitle,
    trend: "neutral" as const,
    accent: (["default", "violet", "teal", "copper"] as const)[index % 4],
  }));

  return (
    <div className="contractor-dashboard-monitoring">
      <ContractorGlassKpiRow metrics={metrics} ariaLabel="Мониторинг подрядчика" />

      <div className="contractor-dashboard-monitoring__widgets">
        <section className="contractor-dashboard-widget pv2-card-l2">
          <header className="contractor-dashboard-widget__head">
            <h3 className="contractor-dashboard-widget__title">Прогресс форм</h3>
            <button type="button" className="contractor-dashboard-widget__link" onClick={onOpenForms}>
              К таблицам
            </button>
          </header>
          {formProgress.length === 0 ? (
            <p className="contractor-dashboard-widget__empty">Назначенных таблиц пока нет.</p>
          ) : (
            <ul className="contractor-dashboard-widget__bars">
              {formProgress.map((row) => (
                <li key={row.templateId} className="contractor-dashboard-progress">
                  <div className="contractor-dashboard-progress__row">
                    <span className="contractor-dashboard-progress__label">{row.title}</span>
                    <span
                      className={cx(
                        "contractor-dashboard-progress__pct",
                        row.overdue && "contractor-dashboard-progress__pct--overdue"
                      )}
                    >
                      {row.submitted ? "Сдано" : `${row.fillPercent}%`}
                    </span>
                  </div>
                  <div className="contractor-dashboard-progress__track" aria-hidden>
                    <div
                      className={cx(
                        "contractor-dashboard-progress__fill",
                        row.submitted && "contractor-dashboard-progress__fill--done",
                        row.overdue && "contractor-dashboard-progress__fill--overdue"
                      )}
                      style={{ width: `${row.submitted ? 100 : row.fillPercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="contractor-dashboard-widget pv2-card-l2">
          <header className="contractor-dashboard-widget__head">
            <h3 className="contractor-dashboard-widget__title">Статусы студентов</h3>
            <button
              type="button"
              className="contractor-dashboard-widget__link"
              onClick={onOpenStudents}
            >
              К подборкам
            </button>
          </header>
          {studentStatuses.length === 0 ? (
            <p className="contractor-dashboard-widget__empty">Подборок от администратора пока нет.</p>
          ) : (
            <ul className="contractor-dashboard-widget__statuses">
              {studentStatuses.slice(0, 8).map((row) => (
                <li key={row.proposalId} className="contractor-dashboard-status">
                  <div className="contractor-dashboard-status__main">
                    <span className="contractor-dashboard-status__name">{row.name}</span>
                    <span className="contractor-dashboard-status__spec">{row.specializationTitle}</span>
                  </div>
                  <span
                    className={cx(
                      "contractor-dashboard-status__badge",
                      row.status === "new" && "contractor-dashboard-status__badge--new"
                    )}
                  >
                    {row.status === "new" ? "Новая" : "Просмотрена"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default memo(ContractorDashboardMonitoringPanel);
