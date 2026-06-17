import { memo } from "react";
import { CabinetRailIcon, type CabinetRailIconId } from "./cabinet/CabinetRailIcons";
import { cx } from "../design-system/cabinetChromeClasses";
import { playUiTapSound } from "../utils/desktopUiFeedback";

export type CabinetDockItem = {
  id: string;
  label: string;
  /** Короткая подпись под иконкой */
  shortLabel: string;
  icon: CabinetRailIconId;
  onClick: () => void;
  active?: boolean;
  /** Красная точка (непрочитанное и т.п.) */
  badge?: boolean;
};

type Props = {
  items: CabinetDockItem[];
  className?: string;
};

/** Плавающий dock v2 — быстрые разделы кабинета. */
function CabinetQuickDock({ items, className }: Props) {
  if (items.length === 0) return null;

  return (
    <nav
      className={cx("cabinet-quick-dock", className)}
      aria-label="Быстрая навигация по кабинету"
    >
      <div className="cabinet-quick-dock__inner">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cx("cabinet-quick-dock__btn", item.active && "cabinet-quick-dock__btn--active")}
            onClick={() => {
              playUiTapSound();
              item.onClick();
            }}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            title={item.label}
          >
            <span className="cabinet-quick-dock__icon" aria-hidden>
              <CabinetRailIcon id={item.icon} size={20} />
            </span>
            <span className="cabinet-quick-dock__label">{item.shortLabel}</span>
            {item.badge ? <span className="cabinet-quick-dock__badge" aria-hidden /> : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default memo(CabinetQuickDock);
