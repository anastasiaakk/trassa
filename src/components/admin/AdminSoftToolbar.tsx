import { memo } from "react";

export type AdminSoftFilterOption = { value: string; label: string };

type Props = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterValue?: string;
  filterOptions?: AdminSoftFilterOption[];
  onFilterChange?: (value: string) => void;
  filterAriaLabel?: string;
  matchCount?: number;
  totalCount?: number;
};

function AdminSoftToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Поиск…",
  filterValue,
  filterOptions,
  onFilterChange,
  filterAriaLabel = "Фильтр",
  matchCount,
  totalCount,
}: Props) {
  const hasFilter = filterOptions && filterOptions.length > 0 && onFilterChange;
  const showMeta =
    typeof matchCount === "number" &&
    typeof totalCount === "number" &&
    (searchValue.trim() !== "" || (hasFilter && filterValue && filterValue !== "all"));

  return (
    <div className="admin-soft-toolbar" role="search">
      <div className="admin-soft-toolbar__search-wrap">
        <span className="admin-soft-toolbar__search-icon" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          className="admin-soft-toolbar__search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
        />
        {searchValue ? (
          <button
            type="button"
            className="admin-soft-toolbar__clear"
            onClick={() => onSearchChange("")}
            aria-label="Очистить поиск"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="admin-soft-toolbar__aside">
        {hasFilter ? (
          <label className="admin-soft-toolbar__filter">
            <span className="admin-soft-toolbar__filter-label">{filterAriaLabel}</span>
            <select
              className="admin-soft-toolbar__select"
              value={filterValue ?? filterOptions[0]?.value}
              onChange={(e) => onFilterChange(e.target.value)}
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showMeta ? (
          <p className="admin-soft-toolbar__meta" aria-live="polite">
            {matchCount} из {totalCount}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default memo(AdminSoftToolbar);
