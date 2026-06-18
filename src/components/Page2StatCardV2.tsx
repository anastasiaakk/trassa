import { memo } from "react";
import {
  ICON_PAGE2_CONTRACTORS,
  ICON_PAGE2_PROJECTS,
  ICON_PAGE2_STATISTICS,
} from "../assets/appIcons";
import { cx } from "../design-system/cabinetChromeClasses";
import styles from "../pages/ServicesMapPage.module.css";

export type Page2StatData = {
  id: string;
  tag: string;
  value: string;
  label: string;
  spark: readonly number[];
};

const PAGE2_STAT_ICON_SRC: Record<Page2StatData["id"], string | null> = {
  regions: ICON_PAGE2_CONTRACTORS,
  contractors: ICON_PAGE2_STATISTICS,
  projects: ICON_PAGE2_PROJECTS,
  response: null,
};

function Page2StatIcon({ id }: { id: Page2StatData["id"] }) {
  const src = PAGE2_STAT_ICON_SRC[id];
  if (src) {
    return (
      <img
        className={cx("page2-v2__stat-icon-img", id === "regions" && "page2-v2__stat-icon-img--lg")}
        src={src}
        alt=""
        width={id === "regions" ? 22 : 18}
        height={id === "regions" ? 22 : 18}
        decoding="async"
      />
    );
  }

  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      {id === "response" && (
        <path
          d="M12 7v5.2l3.2 1.9-.8 1.3L11 13.2V7h1zm0-5a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function Page2ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden>
      <path
        d="M5 18V9M10 18V5M15 18v-7M20 18V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Page2StatCardV2Props = {
  stat: Page2StatData;
  monitorOpen: boolean;
  onOpenMonitor: () => void;
};

function Page2StatCardV2({ stat, monitorOpen, onOpenMonitor }: Page2StatCardV2Props) {
  return (
    <article className={cx(styles.statItem, "page2-v2__stat")}>
      <div className="page2-v2__stat-head">
        <div className="page2-v2__stat-head-main">
          <span className="page2-v2__stat-icon" aria-hidden>
            <Page2StatIcon id={stat.id} />
          </span>
          <span className={cx(styles.statTag, "page2-v2__stat-title")}>{stat.tag}</span>
        </div>
        <button
          type="button"
          className={cx("page2-v2__stat-chart-btn", monitorOpen && "page2-v2__stat-chart-btn--active")}
          onClick={onOpenMonitor}
          aria-haspopup="dialog"
          aria-expanded={monitorOpen}
          title="Открыть мониторинг"
        >
          <Page2ChartIcon />
        </button>
      </div>

      <p className={cx(styles.statLabel, "page2-v2__stat-meta")}>{stat.label}</p>

      <div className="page2-v2__stat-metric">
        <span className={cx(styles.statNum, "page2-v2__stat-value")}>{stat.value}</span>
      </div>
    </article>
  );
}

export default memo(Page2StatCardV2);
