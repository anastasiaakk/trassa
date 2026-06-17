import { memo, type ChangeEvent } from "react";
import { ICON_SEARCH } from "../assets/appIcons";
import { cx } from "../design-system/cabinetChromeClasses";

type Props = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
};

/** Поиск в шапке кабинета v2 — иконка слева, без наложения на текст. */
function CabinetV2SearchField({
  value,
  onChange,
  placeholder = "Поиск…",
  className,
}: Props) {
  return (
    <label className={cx("cabinet-v2-search", className)}>
      <img
        decoding="async"
        src={ICON_SEARCH}
        alt=""
        className="cabinet-v2-search__icon"
        width={18}
        height={18}
      />
      <input
        type="search"
        className="cabinet-v2-search__input cabinet-chrome__search-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}

export default memo(CabinetV2SearchField);
