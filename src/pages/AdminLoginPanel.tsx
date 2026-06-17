import { FormEvent, useCallback, useState } from "react";
import { loginAdmin } from "../utils/adminAuth";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import styles from "./AdminPanel.module.css";
import glass from "./AdminPanelGlass.module.css";

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
  /** Общий «милый» фон на странице (Page2) — без дублирующей заливки .cabinetBg */
  useParentPageBackground?: boolean;
};

export default function AdminLoginPanel({
  onSuccess,
  onCancel,
  useParentPageBackground = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setBusy(true);
      try {
        const result = await loginAdmin(email, password);
        if (result.ok) {
          onSuccess();
        } else {
          setError(result.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось войти.");
      } finally {
        setBusy(false);
      }
    },
    [email, onSuccess, password]
  );

  const glassEmbed = useParentPageBackground;
  const isV2 = usePortalDesign() === "v2";

  return (
    <div
      className={cx(
        styles.cabinetPage,
        glassEmbed ? glass.themeGlass : styles.themeLogin,
        useParentPageBackground && styles.cabinetPageEmbed,
        useParentPageBackground && glass.themeGlassMap,
        isV2 && glassEmbed && "admin-login-v2"
      )}
    >
      <div
        className={`${styles.cabinetBg} ${useParentPageBackground ? styles.cabinetBgTransparent : ""}`}
        aria-hidden
      />

      <div className={glassEmbed ? glass.glassLoginShell : styles.loginShell}>
        <div
          className={
            glassEmbed
              ? glass.glassLoginCard
              : `${styles.neoCard} ${styles.loginCard}`
          }
        >
          <p className={styles.cabinetKicker}>Администраторам</p>
          <h2 className={styles.loginTitle}>Вход в личный кабинет</h2>
          <p className={styles.loginLead}>
            Добро пожаловать. Сессия действует до закрытия вкладки.
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.label}>
              Электронная почта
              <input
                className={styles.inputNeo}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="например@mail.ru"
                required
              />
            </label>
            <label className={styles.label}>
              Пароль
              <input
                className={styles.inputNeo}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.rowBtns}>
              <button type="submit" className={styles.btnNeoPrimary} disabled={busy}>
                {busy ? "Вход…" : "Войти"}
              </button>
              <button type="button" className={styles.btnNeoGhost} onClick={onCancel}>
                К карте
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
