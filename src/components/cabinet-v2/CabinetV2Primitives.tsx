import { memo, type CSSProperties, type ReactNode } from "react";
import { cx } from "../../design-system/cabinetChromeClasses";
import CabinetHomeIcon from "../CabinetHomeIcon";
import HeroRoleIconButton from "../HeroRoleIconButton";
import { heroTagBadgeStyle, heroTopRowStyle } from "../../utils/cabinetHero";

/** Кнопка навигации в компактном aside v2. */
export const CabinetV2AsideNav = memo(function CabinetV2AsideNav({
  active,
  label,
  badge,
  onClick,
  showHomeIcon,
  iconColor,
}: {
  active: boolean;
  label: string;
  badge?: string;
  onClick: () => void;
  showHomeIcon?: boolean;
  iconColor?: string;
}) {
  return (
    <button
      type="button"
      className={cx("cabinet-v2-aside__nav", active && "cabinet-v2-aside__nav--active")}
      onClick={onClick}
    >
      {showHomeIcon ? <CabinetHomeIcon size={22} color={iconColor ?? "currentColor"} /> : null}
      <span>{label}</span>
      {badge ? <span className="cabinet-v2-aside__badge">{badge}</span> : null}
    </button>
  );
});

export const CabinetV2AsideCard = memo(function CabinetV2AsideCard({
  kicker,
  title,
  text,
}: {
  kicker: string;
  title: string;
  text: string;
}) {
  return (
    <div className="cabinet-v2-aside__card pv2-card-l3">
      <p className="cabinet-v2-aside__kicker">{kicker}</p>
      <h2 className="cabinet-v2-aside__title">{title}</h2>
      <p className="cabinet-v2-aside__text">{text}</p>
    </div>
  );
});

export const CabinetV2AsideTile = memo(function CabinetV2AsideTile({
  active,
  title,
  text,
  badge,
  onClick,
}: {
  active?: boolean;
  title: string;
  text: string;
  badge?: string | number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={cx("cabinet-v2-aside__tile", active && "cabinet-v2-aside__tile--active")}
      onClick={onClick}
    >
      <p className="cabinet-v2-aside__tile-title">
        {title}
        {badge ? <span className="cabinet-v2-aside__badge">{badge}</span> : null}
      </p>
      <p className="cabinet-v2-aside__tile-text">{text}</p>
    </button>
  );
});

export const CabinetV2Hero = memo(function CabinetV2Hero({
  heroClassName,
  heroStyle,
  tag,
  heroTitle,
  heroEmpty,
  roleIconSrc,
  heroButtonStyle,
  primaryAction,
}: {
  heroClassName: string;
  heroStyle: CSSProperties;
  tag: string;
  heroTitle?: string;
  heroEmpty: string;
  roleIconSrc: string;
  heroButtonStyle: CSSProperties;
  primaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <article
      className={cx("cabinet-v2-dashboard__hero", "cabinet-hero-plaque", "pv2-hero", "pv2-card-l1", heroClassName)}
      style={heroStyle}
    >
      <div style={heroTopRowStyle}>
        <span className="cabinet-v2-dashboard__hero-tag">{tag}</span>
        <HeroRoleIconButton iconSrc={roleIconSrc} buttonBaseStyle={heroButtonStyle} />
      </div>
      <div className="cabinet-v2-dashboard__hero-foot">
        {heroTitle ? (
          <h2 className="cabinet-v2-dashboard__hero-title">{heroTitle}</h2>
        ) : (
          <p className="cabinet-v2-dashboard__hero-empty">{heroEmpty}</p>
        )}
        {primaryAction ? (
          <button type="button" className="cabinet-v2-dashboard__hero-cta" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </button>
        ) : null}
      </div>
    </article>
  );
});

export const CabinetV2InfoCard = memo(function CabinetV2InfoCard({
  className,
  label,
  title,
  text,
  actionLabel,
  onAction,
}: {
  className: string;
  label: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className={cx("cabinet-v2-dashboard__info", "cabinet-chrome__info-card", "pv2-card-l2", className)}>
      <p className="cabinet-v2-dashboard__info-label">{label}</p>
      <h3 className="cabinet-v2-dashboard__info-title">{title}</h3>
      <p className="cabinet-v2-dashboard__info-text">{text}</p>
      {actionLabel && onAction ? (
        <button type="button" className="cabinet-v2-dashboard__info-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
});

export const CabinetV2ActionCard = memo(function CabinetV2ActionCard({
  active,
  title,
  text,
  liveCount,
  badge,
  onClick,
}: {
  active?: boolean;
  title: string;
  text: string;
  /** Всегда видимая цифра (всего таблиц, студентов и т.д.). */
  liveCount?: number;
  /** Дополнительный бейдж «новое» поверх liveCount. */
  badge?: number;
  onClick: () => void;
}) {
  const showLive = typeof liveCount === "number";
  const showUnread = typeof badge === "number" && badge > 0;

  return (
    <button
      type="button"
      className={cx(
        "cabinet-v2-dashboard__action",
        "pv2-card-l3",
        active && "cabinet-v2-dashboard__action--active"
      )}
      onClick={onClick}
    >
      <p className="cabinet-v2-dashboard__action-title">
        {title}
        {showLive ? (
          <span
            className={cx(
              "cabinet-v2-dashboard__action-count",
              showUnread && "cabinet-v2-dashboard__action-count--alert"
            )}
          >
            {liveCount}
          </span>
        ) : showUnread ? (
          <span className="cabinet-v2-dashboard__action-badge">{badge}</span>
        ) : null}
      </p>
      <p className="cabinet-v2-dashboard__action-text">{text}</p>
    </button>
  );
});

export type CabinetV2EventItem = {
  id: string;
  title: string;
  meta: string;
  description?: string;
};

export const CONTRACTOR_UPCOMING_EVENTS_PANEL_ID = "contractor-upcoming-events";

export const CabinetV2EventsPanel = memo(function CabinetV2EventsPanel({
  panelClassName,
  titleClassName,
  title,
  hint,
  emptyText,
  items,
  defaultExpanded = true,
  panelId,
}: {
  panelClassName: string;
  titleClassName: string;
  title: string;
  hint: string;
  emptyText: string;
  items: CabinetV2EventItem[];
  defaultExpanded?: boolean;
  panelId?: string;
}) {
  const countLabel = items.length > 0 ? `${items.length}` : "0";
  return (
    <details
      id={panelId}
      className={cx(
        "cabinet-v2-dashboard__events",
        "cabinet-v2-dashboard__events--collapsible",
        "cabinet-chrome__recent-panel",
        "pv2-card-l1",
        "pv2-accent-edge",
        panelClassName
      )}
      open={defaultExpanded}
    >
      <summary className={cx("cabinet-v2-dashboard__events-summary", titleClassName)}>
        {title}
        <span className="cabinet-v2-dashboard__events-count">{countLabel}</span>
      </summary>
      <div className="cabinet-v2-dashboard__events-body">
        <p className="cabinet-v2-dashboard__events-hint">{hint}</p>
        {items.length === 0 ? (
          <p className="cabinet-v2-dashboard__empty">{emptyText}</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className="cabinet-v2-dashboard__event">
              <h3 className="cabinet-v2-dashboard__event-title">{item.title}</h3>
              <p className="cabinet-v2-dashboard__event-meta">{item.meta}</p>
              {item.description ? <p className="cabinet-v2-dashboard__event-desc">{item.description}</p> : null}
            </article>
          ))
        )}
      </div>
    </details>
  );
});

export function CabinetV2DashboardFrame({ children }: { children: ReactNode }) {
  return <div className="cabinet-v2-dashboard__stage">{children}</div>;
}
