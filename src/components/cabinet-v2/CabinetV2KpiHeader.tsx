import { memo } from "react";
import CabinetKpiCard, { type CabinetKpiCardProps } from "../CabinetKpiCard";

export type CabinetV2KpiMetric = CabinetKpiCardProps & {
  /** Уникальный ключ (если label повторяется) */
  id?: string;
};

const KPI_ACCENTS = ["teal", "cyan", "blend", "deep"] as const;

type Props = {
  metrics: CabinetV2KpiMetric[];
  ariaLabel?: string;
};

/** Верхний блок KPI — карточки метрик без графиков. */
function CabinetV2KpiHeader({ metrics, ariaLabel = "Ключевые показатели" }: Props) {
  return (
    <div className="cabinet-v2-page-kpi">
      <div className="cabinet-v2-kpi-row" aria-label={ariaLabel}>
        {metrics.map((m, index) => (
          <CabinetKpiCard
            key={m.id ?? m.label}
            label={m.label}
            value={m.value}
            accent={m.accent ?? KPI_ACCENTS[index % KPI_ACCENTS.length]}
            trend={m.trend}
            trendLabel={m.trendLabel}
            valuePrefix={m.valuePrefix}
            insight={m.insight}
            insightActionLabel={m.insightActionLabel}
            onInsightClick={m.onInsightClick}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(CabinetV2KpiHeader);
