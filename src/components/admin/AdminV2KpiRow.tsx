import { memo } from "react";
import CabinetKpiCard, { type CabinetKpiCardProps } from "../CabinetKpiCard";
import { cx } from "../../design-system/cabinetChromeClasses";

export type AdminV2KpiItem = CabinetKpiCardProps & {
  id: string;
};

const DEFAULT_ACCENTS: CabinetKpiCardProps["accent"][] = ["teal", "cyan", "blend", "deep"];

type Props = {
  items: AdminV2KpiItem[];
  className?: string;
};

function AdminV2KpiRow({ items, className }: Props) {
  return (
    <div className={cx("cabinet-v2-page-kpi", "admin-v2__kpi-wrap", className)}>
    <div className={cx("cabinet-v2-kpi-row", "admin-v2__kpi-row")} aria-label="Показатели">
      {items.map((item, index) => (
        <CabinetKpiCard
          key={item.id}
          label={item.label}
          value={String(item.value)}
          accent={item.accent ?? DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length]}
          trend={item.trend}
          trendLabel={item.trendLabel}
          insight={item.insight}
          valuePrefix={item.valuePrefix}
          insightActionLabel={item.insightActionLabel}
          onInsightClick={item.onInsightClick}
        />
      ))}
    </div>
    </div>
  );
}

export default memo(AdminV2KpiRow);
