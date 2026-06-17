import { memo } from "react";
import { cx } from "../design-system/cabinetChromeClasses";

export type CabinetKpiAccent = "teal" | "cyan" | "deep" | "blend";
export type CabinetKpiTrend = "up" | "down" | "neutral";

export type CabinetKpiCardProps = {
  label: string;
  value: string;
  accent?: CabinetKpiAccent;
  trend?: CabinetKpiTrend;
  /** Префикс значения, например «$ » или «₽ » */
  valuePrefix?: string;
  /** Бейдж рядом со значением, например «+3» или «−8%» */
  trendLabel?: string;
  /** Нижняя фиолетовая плашка с пояснением */
  insight?: string;
  onInsightClick?: () => void;
  /** Подпись для кнопки insight (скринридер) */
  insightActionLabel?: string;
};

function TrendGlyph({ trend }: { trend: CabinetKpiTrend }) {
  if (trend === "neutral") {
    return (
      <span className="cabinet-v2-kpi-card__trend-icon cabinet-v2-kpi-card__trend-icon--neutral" aria-hidden>
        <span className="cabinet-v2-kpi-card__trend-dot" />
      </span>
    );
  }
  const up = trend === "up";
  return (
    <span
      className={cx(
        "cabinet-v2-kpi-card__trend-icon",
        up ? "cabinet-v2-kpi-card__trend-icon--up" : "cabinet-v2-kpi-card__trend-icon--down"
      )}
      aria-hidden
    >
      <svg viewBox="0 0 20 22" className="cabinet-v2-kpi-card__trend-svg" focusable="false">
        <path className="cabinet-v2-kpi-card__trend-chev" d="M4 6 L10 12 L16 6" />
        <path className="cabinet-v2-kpi-card__trend-chev" d="M4 11 L10 17 L16 11" />
        <path className="cabinet-v2-kpi-card__trend-chev" d="M4 16 L10 22 L16 16" />
      </svg>
    </span>
  );
}

/** KPI-карточка v2: метрика + insight-плашка (без графиков). */
function CabinetKpiCard({
  label,
  value,
  accent = "teal",
  trend = "neutral",
  valuePrefix,
  trendLabel,
  insight,
  onInsightClick,
  insightActionLabel = "Подробнее",
}: CabinetKpiCardProps) {
  const insightText = insight?.trim() ?? "";
  const showInsight = insightText.length > 0;
  const actionable = Boolean(onInsightClick);

  return (
    <article
      className={cx(
        "cabinet-v2-kpi-card",
        `cabinet-v2-kpi-card--${accent}`,
        trend !== "neutral" && `cabinet-v2-kpi-card--trend-${trend}`,
        actionable && "cabinet-v2-kpi-card--actionable"
      )}
      aria-label={`${label}: ${valuePrefix ?? ""}${value}${trendLabel ? `, ${trendLabel}` : ""}`}
    >
      <div className="cabinet-v2-kpi-card__body">
        <div className="cabinet-v2-kpi-card__head">
          <TrendGlyph trend={trend} />
          <h3 className="cabinet-v2-kpi-card__label">{label}</h3>
        </div>
        <div className="cabinet-v2-kpi-card__value-row">
          <p className="cabinet-v2-kpi-card__value">
            {valuePrefix ? <span className="cabinet-v2-kpi-card__value-prefix">{valuePrefix}</span> : null}
            <span className="cabinet-v2-kpi-card__value-num">{value}</span>
          </p>
          {trendLabel ? (
            <span
              className={cx(
                "cabinet-v2-kpi-card__badge",
                trend === "up" && "cabinet-v2-kpi-card__badge--up",
                trend === "down" && "cabinet-v2-kpi-card__badge--down",
                trend === "neutral" && "cabinet-v2-kpi-card__badge--neutral"
              )}
            >
              {trendLabel}
            </span>
          ) : null}
        </div>
      </div>
      {showInsight ? (
        <div className="cabinet-v2-kpi-card__insight-wrap">
          {actionable ? (
            <button
              type="button"
              className="cabinet-v2-kpi-card__insight cabinet-v2-kpi-card__insight--btn"
              onClick={onInsightClick}
              aria-label={`${insightActionLabel}: ${insightText}`}
            >
              <p className="cabinet-v2-kpi-card__insight-text">{insightText}</p>
              <span className="cabinet-v2-kpi-card__insight-btn" aria-hidden>
                ›
              </span>
            </button>
          ) : (
            <div className="cabinet-v2-kpi-card__insight">
              <p className="cabinet-v2-kpi-card__insight-text">{insightText}</p>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default memo(CabinetKpiCard);
