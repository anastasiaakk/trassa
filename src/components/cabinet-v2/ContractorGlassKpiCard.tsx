import { memo } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { CabinetKpiTrend } from "../CabinetKpiCard";

export type ContractorGlassKpiIcon = "calendar" | "forms" | "students" | "documents" | "sections";

export type ContractorGlassKpiCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  icon?: ContractorGlassKpiIcon;
  trend?: CabinetKpiTrend;
  accent?: "default" | "violet" | "teal" | "copper";
  onClick?: () => void;
  insightActionLabel?: string;
};

function KpiIcon({ type }: { type: ContractorGlassKpiIcon }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "contractor-glass-kpi-card__svg",
    "aria-hidden": true,
  };

  switch (type) {
    case "forms":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "students":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.25" />
          <circle cx="17" cy="9.5" r="2.5" />
          <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 19c0-2.2 1.6-4 3.5-4.5" />
        </svg>
      );
    case "documents":
      return (
        <svg {...common}>
          <path d="M14 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "sections":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.75" />
          <rect x="13" y="4" width="7" height="7" rx="1.75" />
          <rect x="4" y="13" width="7" height="7" rx="1.75" />
          <rect x="13" y="13" width="7" height="7" rx="1.75" />
        </svg>
      );
    case "calendar":
    default:
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2.5" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
  }
}

function TrendBadge({ trend }: { trend: CabinetKpiTrend }) {
  if (trend === "neutral") return null;
  const up = trend === "up";
  return (
    <span
      className={cx(
        "contractor-glass-kpi-card__trend",
        up ? "contractor-glass-kpi-card__trend--up" : "contractor-glass-kpi-card__trend--down"
      )}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" fill="none" className="contractor-glass-kpi-card__trend-svg">
        <path
          d={up ? "M8 4 L8 12 M8 4 L5 7 M8 4 L11 7" : "M8 12 L8 4 M8 12 L5 9 M8 12 L11 9"}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ContractorGlassKpiCard({
  label,
  value,
  subtitle,
  icon = "calendar",
  trend = "neutral",
  accent = "default",
  onClick,
  insightActionLabel = "Открыть",
}: ContractorGlassKpiCardProps) {
  const meta = subtitle?.trim() ?? "";
  const interactive = Boolean(onClick);
  const Tag = interactive ? "button" : "article";

  return (
    <Tag
      type={interactive ? "button" : undefined}
      className={cx(
        "contractor-glass-kpi-card",
        `contractor-glass-kpi-card--${accent}`,
        interactive && "contractor-glass-kpi-card--actionable"
      )}
      onClick={onClick}
      aria-label={
        interactive
          ? `${insightActionLabel}: ${label}, ${value}${meta ? `, ${meta}` : ""}`
          : `${label}: ${value}${meta ? `, ${meta}` : ""}`
      }
    >
      <div className="contractor-glass-kpi-card__top">
        <span className="contractor-glass-kpi-card__icon">
          <KpiIcon type={icon} />
        </span>
        <div className="contractor-glass-kpi-card__copy">
          <h3 className="contractor-glass-kpi-card__title">{label}</h3>
          {meta ? <p className="contractor-glass-kpi-card__meta">{meta}</p> : null}
        </div>
      </div>
      <div className="contractor-glass-kpi-card__foot">
        <span className="contractor-glass-kpi-card__value">{value}</span>
        <TrendBadge trend={trend} />
      </div>
    </Tag>
  );
}

export default memo(ContractorGlassKpiCard);
