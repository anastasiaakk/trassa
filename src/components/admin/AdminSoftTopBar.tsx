import { memo } from "react";
import { IconLogout, IconTheme } from "../icons/AppToolbarIcons";
import AdminSoftAvatar from "./AdminSoftAvatar";
import { IconMapBack } from "./AdminNavIcons";

type Props = {
  displayName: string;
  email?: string | null;
  sectionTitle: string;
  preferLight: boolean;
  onThemeToggle: () => void;
  onLogout: () => void;
  onBackToMap?: () => void;
};

function AdminSoftTopBar({
  displayName,
  email,
  sectionTitle,
  preferLight,
  onThemeToggle,
  onLogout,
  onBackToMap,
}: Props) {
  const firstName = displayName.trim().split(/\s+/)[0] || displayName;

  return (
    <header className="admin-soft-topbar">
      <div className="admin-soft-topbar__lead">
        <p className="admin-soft-topbar__eyebrow">Цифровой портал · администрирование</p>
        <h1 className="admin-soft-topbar__title">
          Здравствуйте, {firstName}
          <span className="admin-soft-topbar__wave" aria-hidden>
            {" "}
            👋
          </span>
        </h1>
        <p className="admin-soft-topbar__subtitle">
          Раздел «{sectionTitle}». Здесь вы управляете данными портала и настройками.
          {email ? ` · ${email}` : ""}
        </p>
      </div>

      <div className="admin-soft-topbar__actions" aria-label="Действия панели">
        {onBackToMap ? (
          <button
            type="button"
            className="admin-soft-topbar__icon-btn admin-soft-topbar__icon-btn--text"
            onClick={onBackToMap}
            title="К карте подрядчиков"
          >
            <IconMapBack size={18} />
            <span>К карте</span>
          </button>
        ) : null}
        <button
          type="button"
          className="admin-soft-topbar__icon-btn"
          onClick={onThemeToggle}
          aria-label={preferLight ? "Светлая тема" : "Тёмная тема"}
          title={preferLight ? "Светлая тема" : "Тёмная тема"}
        >
          <IconTheme size={18} />
        </button>
        <button
          type="button"
          className="admin-soft-topbar__icon-btn"
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти"
        >
          <IconLogout size={18} />
        </button>
        <AdminSoftAvatar emailNorm={email ?? null} displayName={displayName} />
      </div>
    </header>
  );
}

export default memo(AdminSoftTopBar);
