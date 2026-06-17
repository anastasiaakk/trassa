import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { ProfileSettingsData } from "../../profileSettingsStorage";
import {
  adminOverrideUserProfile,
  deleteRegisteredUser,
  isLegacyLoginAllowed,
  resetPasswordForEmail,
  type LocalUserRecord,
} from "../../utils/localAuth";
import {
  authAdminDeleteUser,
  authAdminResetUserPassword,
  authAdminUpdateUser,
} from "../../api/authApi";
import { PASSWORD_RULES_SHORT, validatePasswordPolicy } from "../../utils/passwordPolicy";
import {
  loadActiveSpecializations,
  specializationTitle,
} from "../../utils/specializationsStorage";
import styles from "../../pages/AdminPanel.module.css";
import glass from "../../pages/AdminPanelGlass.module.css";

function cloneProfile(profile: ProfileSettingsData): ProfileSettingsData {
  return { ...profile };
}

type Props = {
  users: LocalUserRecord[];
  searchQuery: string;
  apiEnabled: boolean;
  softUi: boolean;
  onRefresh: () => void;
  onEditingActive?: (active: boolean) => void;
};

export default function AdminUsersPanel({
  users,
  searchQuery,
  apiEnabled,
  softUi,
  onRefresh,
  onEditingActive,
}: Props) {
  const [editingUser, setEditingUser] = useState<LocalUserRecord | null>(null);
  const [editDraft, setEditDraft] = useState<ProfileSettingsData | null>(null);
  const [passwordEmail, setPasswordEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const legacyDemo = isLegacyLoginAllowed();
  const normQ = searchQuery.trim().toLowerCase();

  useEffect(() => {
    onEditingActive?.(editingUser !== null || passwordEmail !== null);
  }, [editingUser, passwordEmail, onEditingActive]);

  const onDelete = useCallback(
    async (user: LocalUserRecord) => {
      const label = user.profile.email || user.emailNorm;
      if (
        !window.confirm(
          `Удалить пользователя ${label}?\nВход по этому адресу станет невозможен. Связанные данные (в т.ч. профориентация) будут удалены. Действие необратимо.`,
        )
      ) {
        return;
      }
      const res = apiEnabled
        ? await authAdminDeleteUser(user.emailNorm)
        : deleteRegisteredUser(user.emailNorm);
      if (!res.ok) {
        setStatusMessage(res.error ?? "Не удалось удалить пользователя.");
        return;
      }
      setStatusMessage(`Пользователь ${label} удалён.`);
      if (editingUser?.emailNorm === user.emailNorm) {
        setEditingUser(null);
        setEditDraft(null);
      }
      if (passwordEmail === user.emailNorm) {
        setPasswordEmail(null);
        setNewPassword("");
        setPasswordFeedback(null);
      }
      onRefresh();
    },
    [apiEnabled, editingUser?.emailNorm, passwordEmail, onRefresh],
  );

  const onSaveProfile = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!editingUser || !editDraft) return;
      if (apiEnabled) {
        const res = await authAdminUpdateUser(editingUser.emailNorm, editDraft);
        if (!res.ok) {
          setStatusMessage(res.error ?? "Не удалось сохранить изменения пользователя.");
          return;
        }
      } else if (!adminOverrideUserProfile(editingUser.emailNorm, editDraft)) {
        setStatusMessage("Не удалось сохранить изменения пользователя.");
        return;
      }
      onRefresh();
      setEditingUser(null);
      setEditDraft(null);
      setStatusMessage(null);
    },
    [apiEnabled, editingUser, editDraft, onRefresh],
  );

  const onSetPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!passwordEmail) return;
      setPasswordFeedback(null);
      const policyErr = validatePasswordPolicy(newPassword);
      if (policyErr) {
        setPasswordFeedback(policyErr);
        return;
      }
      const res = apiEnabled
        ? await authAdminResetUserPassword(passwordEmail, newPassword)
        : await resetPasswordForEmail(passwordEmail, newPassword);
      if (res.ok) {
        setPasswordFeedback("Пароль обновлён.");
        setNewPassword("");
        setPasswordEmail(null);
      } else {
        setPasswordFeedback(res.error);
      }
    },
    [apiEnabled, passwordEmail, newPassword],
  );

  return (
    <>
      {statusMessage ? (
        <p className={statusMessage.includes("удалён") ? glass.glassMsg : styles.error}>
          {statusMessage}
        </p>
      ) : null}

      {!softUi && legacyDemo && !apiEnabled ? (
        <p className={styles.hint}>
          Зарегистрированных пользователей пока нет — на странице входа допускается прежний
          демо-вход с любым логином и паролем.
        </p>
      ) : null}

      {!softUi && apiEnabled ? (
        <p className={styles.hint}>
          Список пользователей загружается с сервера. Редактирование профиля и удаление
          выполняются на серверной стороне. Сброс пароля пока доступен только в локальном режиме.
        </p>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Электронная почта</th>
              <th>Имя</th>
              <th>Должность</th>
              <th>Спецификация</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <span className={styles.hint}>
                    {normQ ? "Ничего не найдено — измените запрос." : "Список пуст."}
                  </span>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.emailNorm}>
                  <td>{user.profile.email || user.emailNorm}</td>
                  <td>
                    {user.profile.firstName} {user.profile.lastName}
                  </td>
                  <td>{user.profile.roleLabel}</td>
                  <td>{specializationTitle(user.profile.specializationId)}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => {
                        setEditingUser(user);
                        setEditDraft(cloneProfile(user.profile));
                      }}
                    >
                      Править
                    </button>{" "}
                    {!apiEnabled ? (
                      <button
                        type="button"
                        className={styles.btnSmall}
                        onClick={() => {
                          setPasswordEmail(user.emailNorm);
                          setPasswordFeedback(null);
                          setNewPassword("");
                        }}
                      >
                        Пароль
                      </button>
                    ) : null}{" "}
                    <button
                      type="button"
                      className={styles.btnSmallDanger}
                      onClick={() => void onDelete(user)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser && editDraft ? (
        <form className={styles.editGrid} onSubmit={onSaveProfile}>
          <h4 className={styles.sectionTitle} style={{ gridColumn: "1 / -1" }}>
            Профиль: {editingUser.emailNorm}
          </h4>
          <label className={styles.label}>
            Имя
            <input
              className={styles.input}
              value={editDraft.firstName}
              onChange={(e) => setEditDraft({ ...editDraft, firstName: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            Фамилия
            <input
              className={styles.input}
              value={editDraft.lastName}
              onChange={(e) => setEditDraft({ ...editDraft, lastName: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            Должность / роль в системе
            <input
              className={styles.input}
              value={editDraft.roleLabel}
              onChange={(e) => setEditDraft({ ...editDraft, roleLabel: e.target.value })}
            />
          </label>
          <label className={styles.label}>
            Телефон
            <input
              className={styles.input}
              value={editDraft.phone}
              onChange={(e) => setEditDraft({ ...editDraft, phone: e.target.value })}
            />
          </label>
          <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
            Организация (подрядчик)
            <input
              className={styles.input}
              value={editDraft.contractorCompanyName}
              onChange={(e) =>
                setEditDraft({ ...editDraft, contractorCompanyName: e.target.value })
              }
            />
          </label>
          <label className={styles.label} style={{ gridColumn: "1 / -1" }}>
            Спецификация
            <select
              className={styles.input}
              value={editDraft.specializationId ?? ""}
              onChange={(e) =>
                setEditDraft({ ...editDraft, specializationId: e.target.value })
              }
            >
              <option value="">— не выбрана —</option>
              {loadActiveSpecializations().map((spec) => (
                <option key={spec.id} value={spec.id}>
                  {spec.title}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={editDraft.notifyEmail}
              onChange={(e) => setEditDraft({ ...editDraft, notifyEmail: e.target.checked })}
            />{" "}
            Уведомления e-mail
          </label>
          <label className={styles.label}>
            <input
              type="checkbox"
              checked={editDraft.notifyPush}
              onChange={(e) => setEditDraft({ ...editDraft, notifyPush: e.target.checked })}
            />{" "}
            Push
          </label>
          <div className={styles.rowBtns} style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className={styles.btnNeoPrimary}>
              Сохранить
            </button>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => {
                setEditingUser(null);
                setEditDraft(null);
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {!apiEnabled && passwordEmail ? (
        <form className={styles.form} style={{ marginTop: 16 }} onSubmit={onSetPassword}>
          <h4 className={styles.sectionTitle}>Новый пароль для {passwordEmail}</h4>
          <p className={styles.hint}>{PASSWORD_RULES_SHORT}</p>
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
          {passwordFeedback ? (
            <p
              className={
                passwordFeedback.includes("обновлён") ? glass.glassMsg : styles.error
              }
            >
              {passwordFeedback}
            </p>
          ) : null}
          <div className={styles.rowBtns}>
            <button type="submit" className={styles.btnNeoPrimary}>
              Установить пароль
            </button>
            <button
              type="button"
              className={styles.btnNeoGhost}
              onClick={() => setPasswordEmail(null)}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
