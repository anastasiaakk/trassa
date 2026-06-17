import { memo, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import AdminGlassAreaChart from "./admin/AdminGlassAreaChart";
import type { Page2StatData } from "./Page2StatCardV2";

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function buildSparkLabels(count: number): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 86_400_000;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getTime() - (count - 1 - index) * dayMs);
    return formatDayLabel(date);
  });
}

type Page2StatMonitorPopupProps = {
  stat: Page2StatData | null;
  open: boolean;
  onClose: () => void;
};

function Page2StatMonitorPopup({ stat, open, onClose }: Page2StatMonitorPopupProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const chart = useMemo(() => {
    if (!stat) return null;
    const values = [...stat.spark];
    const labels = buildSparkLabels(values.length);
    const fromValue = values[0];
    const toValue = values[values.length - 1];
    const days = values.length;
    return { values, labels, fromValue, toValue, days };
  }, [stat]);

  if (!open || !stat || !chart) return null;

  return createPortal(
    <div
      className="page2-v2__monitor-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="page2-v2__monitor-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`page2-monitor-title-${stat.id}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="page2-v2__monitor-head">
          <div className="page2-v2__monitor-head-text">
            <p className="page2-v2__monitor-eyebrow">Мониторинг</p>
            <h2 id={`page2-monitor-title-${stat.id}`} className="page2-v2__monitor-title">
              {stat.tag}
            </h2>
          </div>
          <button
            type="button"
            className="page2-v2__monitor-close"
            onClick={onClose}
            aria-label="Закрыть окно мониторинга"
          >
            ×
          </button>
        </header>

        <div className="page2-v2__monitor-chart">
          <AdminGlassAreaChart
            embedded
            variant="map"
            title="Динамика показателя"
            meta={`за ${chart.days} дн.`}
            labels={chart.labels}
            values={chart.values}
            emptyHint="Нет данных для построения графика."
          />
        </div>

        <div className="page2-v2__stat-monitor-foot">
          <div className="page2-v2__stat-monitor-point">
            <span className="page2-v2__stat-monitor-num">{chart.fromValue}</span>
            <span className="page2-v2__stat-monitor-hint">Начало периода</span>
          </div>
          <div className="page2-v2__stat-monitor-point page2-v2__stat-monitor-point--end">
            <span className="page2-v2__stat-monitor-num">{chart.toValue}</span>
            <span className="page2-v2__stat-monitor-hint">Конец периода</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default memo(Page2StatMonitorPopup);
