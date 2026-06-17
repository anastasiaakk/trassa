import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { ContractorDeadlineItem } from "../../utils/contractorDashboardData";

export const CONTRACTOR_DEADLINES_PANEL_ID = "contractor-deadlines-panel";

const KIND_LABEL: Record<ContractorDeadlineItem["kind"], string> = {
  form: "Таблица",
  letter: "Письмо",
  event: "Событие",
};

type Props = {
  panelId?: string;
  items: ContractorDeadlineItem[];
  panelClassName: string;
  onOpenForms: () => void;
  onOpenDocuments: () => void;
  onOpenEvents: () => void;
};

function ContractorDashboardDeadlinesPanel({
  panelId = CONTRACTOR_DEADLINES_PANEL_ID,
  items,
  panelClassName,
  onOpenForms,
  onOpenDocuments,
  onOpenEvents,
}: Props) {
  const openItem = (item: ContractorDeadlineItem) => {
    if (item.kind === "form") onOpenForms();
    else if (item.kind === "letter") onOpenDocuments();
    else onOpenEvents();
  };

  return (
    <section
      id={panelId}
      className={cx(
        "contractor-dashboard-deadlines",
        "cabinet-chrome__recent-panel",
        "pv2-card-l1",
        "pv2-accent-edge",
        panelClassName
      )}
    >
      <header className="contractor-dashboard-deadlines__head">
        <h2 className="contractor-dashboard-deadlines__title">Лента дедлайнов</h2>
        <p className="contractor-dashboard-deadlines__hint">
          Формы, письма и мероприятия — по дате наступления срока.
        </p>
      </header>

      {items.length === 0 ? (
        <p className="cabinet-v2-dashboard__empty">Ближайших сроков пока нет.</p>
      ) : (
        <ul className="contractor-dashboard-deadlines__list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cx(
                  "contractor-dashboard-deadlines__item",
                  item.overdue && "contractor-dashboard-deadlines__item--overdue",
                  item.urgent && !item.overdue && "contractor-dashboard-deadlines__item--urgent"
                )}
                onClick={() => openItem(item)}
              >
                <span className="contractor-dashboard-deadlines__kind">{KIND_LABEL[item.kind]}</span>
                <span className="contractor-dashboard-deadlines__item-title">{item.title}</span>
                <span className="contractor-dashboard-deadlines__meta">{item.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default memo(ContractorDashboardDeadlinesPanel);
