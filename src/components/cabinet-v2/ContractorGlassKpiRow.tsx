import { memo } from "react";
import ContractorGlassKpiCard, {
  type ContractorGlassKpiCardProps,
} from "./ContractorGlassKpiCard";

export type ContractorGlassKpiMetric = ContractorGlassKpiCardProps & {
  id?: string;
};

type Props = {
  metrics: ContractorGlassKpiMetric[];
  ariaLabel?: string;
};

const KPI_ACCENTS: ContractorGlassKpiCardProps["accent"][] = [
  "default",
  "violet",
  "teal",
  "copper",
];

/** KPI подрядчика — тёмное стекло по референсу. */
function ContractorGlassKpiRow({ metrics, ariaLabel = "Ключевые показатели" }: Props) {
  return (
    <div className="contractor-glass-kpi">
      <div className="contractor-glass-kpi__row" aria-label={ariaLabel}>
        {metrics.map((m, index) => (
          <ContractorGlassKpiCard
            key={m.id ?? m.label}
            label={m.label}
            value={m.value}
            subtitle={m.subtitle}
            icon={m.icon}
            trend={m.trend}
            accent={m.accent ?? KPI_ACCENTS[index % KPI_ACCENTS.length]}
            onClick={m.onClick}
            insightActionLabel={m.insightActionLabel}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ContractorGlassKpiRow);
