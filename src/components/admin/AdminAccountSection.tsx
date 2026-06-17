import { type FormEvent, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { updateAdminPassword } from "../../utils/adminAuth";
import { markNavigationFromAdminDashboard } from "../../utils/adminReturnNavigation";
import {
  readCabinetContext,
  rememberCabinetEntry,
  rememberProfileReturnPath,
} from "../../utils/profileNavigation";
import { PASSWORD_RULES_SHORT } from "../../utils/passwordPolicy";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";

const QUICK_LINKS = [
  { to: "/role-select", label: "Вход в кабинеты (роли)" },
  { to: "/cabinet-school", label: "Кабинет школьника", cabinet: true },
  { to: "/cabinet-spo", label: "Кабинет студента", cabinet: true },
  { to: "/cabinet-contractor", label: "Подрядчик", cabinet: true },
  { to: "/cabinet-association-rador", label: "РАДОР", cabinet: true },
  { to: "/cabinet-association-ado", label: "АДО", cabinet: true },
] as const;

export default function AdminAccountSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setMessage(null);
      const result = await updateAdminPassword(currentPassword, newPassword);
      if (result.ok) {
        setMessage("Пароль администратора изменён.");
        setCurrentPassword("");
        setNewPassword("");
      } else {
        setMessage(result.error);
      }
    },
    [currentPassword, newPassword],
  );

  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Смена пароля администратора</h3>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label}>
            Текущий пароль
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Новый пароль
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
          {message ? (
            <p className={message.includes("изменён") ? glass.glassMsg : styles.error}>
              {message}
            </p>
          ) : null}
          <button type="submit" className={styles.btnNeoPrimaryNeutral}>
            Сменить пароль
          </button>
        </form>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Быстрые ссылки</h3>
        <div className={glass.quickLinks}>
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => {
                markNavigationFromAdminDashboard();
                if ("cabinet" in item && item.cabinet) {
                  rememberCabinetEntry(item.to);
                }
              }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/profile"
            onClick={() => {
              markNavigationFromAdminDashboard();
              const ctx = readCabinetContext();
              rememberProfileReturnPath(ctx ?? "/services");
            }}
          >
            Настройки профиля
          </Link>
        </div>
      </div>
    </>
  );
}
