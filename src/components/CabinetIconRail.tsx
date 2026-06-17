import { memo } from "react";
import { APP_LOGO_SRC } from "../assets/appIcons";
import { CabinetRailIcon } from "./cabinet/CabinetRailIcons";
import { cx } from "../design-system/cabinetChromeClasses";
import type { CabinetRailItem } from "../utils/cabinetRailItems";

type Props = {
  items: CabinetRailItem[];
};

/** Вертикальный icon rail — Rentier / SunCore pattern. */
function CabinetIconRail({ items }: Props) {
  return (
    <nav className="cabinet-v2-rail pv2-rail" aria-label="Навигация кабинета">
      <div className="cabinet-v2-rail__logo" aria-hidden>
        <img src={APP_LOGO_SRC} alt="" width={36} height={36} decoding="async" />
      </div>
      <div className="cabinet-v2-rail__icons">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cx(
              "cabinet-v2-rail__btn",
              "pv2-rail-btn",
              item.active && "cabinet-v2-rail__btn--active pv2-rail-btn-active"
            )}
            onClick={item.onClick}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            title={item.label}
          >
            <span aria-hidden>
              <CabinetRailIcon id={item.icon} size={20} />
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default memo(CabinetIconRail);
