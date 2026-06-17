import { memo } from "react";
import { APP_LOGO_SRC } from "../assets/appIcons";
import { CabinetRailIcon } from "./cabinet/CabinetRailIcons";
import { cx } from "../design-system/cabinetChromeClasses";
import type { CabinetRailGroup } from "../utils/cabinetRailItems";

type Props = {
  groups: CabinetRailGroup[];
  roleLabel: string;
};

/** Боковое меню кабинета роли — по образцу admin-v2-soft (подписи + группы). */
function CabinetSoftSidebar({ groups, roleLabel }: Props) {
  return (
    <aside className="cabinet-v2-soft-sidebar pv2-card-l1" aria-label="Навигация кабинета">
      <div className="cabinet-v2-soft-sidebar__brand">
        <div className="cabinet-v2-soft-sidebar__logo" aria-hidden>
          <img src={APP_LOGO_SRC} alt="" width={36} height={36} decoding="async" />
        </div>
        <div className="cabinet-v2-soft-sidebar__brand-text">
          <p className="cabinet-v2-soft-sidebar__kicker">Цифровой портал</p>
          <strong className="cabinet-v2-soft-sidebar__role">{roleLabel}</strong>
        </div>
      </div>

      <nav className="cabinet-v2-soft-sidebar__nav">
        {groups.map((group) => (
          <div key={group.id} className="cabinet-v2-soft-sidebar__group">
            <p className="cabinet-v2-soft-sidebar__group-label">{group.label}</p>
            <ul className="cabinet-v2-soft-sidebar__list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cx(
                      "cabinet-v2-soft-sidebar__btn",
                      item.active && "cabinet-v2-soft-sidebar__btn--active"
                    )}
                    onClick={(e) => {
                      item.onClick();
                      e.currentTarget.blur();
                    }}
                    aria-current={item.active ? "page" : undefined}
                  >
                    <span className="cabinet-v2-soft-sidebar__icon" aria-hidden>
                      <CabinetRailIcon id={item.icon} size={18} />
                    </span>
                    <span className="cabinet-v2-soft-sidebar__label">{item.label}</span>
                    {item.badge ? (
                      <span className="cabinet-v2-soft-sidebar__badge">{item.badge}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default memo(CabinetSoftSidebar);
