import { cx } from "../../design-system/cabinetChromeClasses";
import type { Page3AuthState } from "../../hooks/usePage3Auth";
import { PASSWORD_RULES_SHORT } from "../../utils/passwordPolicy";
import styles from "../../pages/Page3.module.css";
import Page3PasswordEyeButton from "./Page3PasswordEyeButton";

type Page3ForgotPasswordSectionProps = {
  isV2: boolean;
  auth: Page3AuthState;
};

export default function Page3ForgotPasswordSection({ isV2, auth }: Page3ForgotPasswordSectionProps) {
  const {
    forgotStep,
    setForgotStep,
    forgotEmail,
    setForgotEmail,
    forgotPassword,
    setForgotPassword,
    forgotPassword2,
    setForgotPassword2,
    showForgotPassword,
    setShowForgotPassword,
    setAuthMode,
    setFormError,
    handleForgotEmailNext,
    handleForgotPasswordSubmit,
  } = auth;

  if (forgotStep === "email") {
    return (
      <form onSubmit={handleForgotEmailNext} noValidate>
        <label className={styles.loginLabel} htmlFor="page3-forgot-email">
          Электронная почта
        </label>
        <input
          id="page3-forgot-email"
          type="email"
          className={styles.loginInput}
          placeholder="например@mail.ru"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          autoComplete="email"
        />
        <button type="submit" className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}>
          Продолжить
        </button>
        <button
          type="button"
          className={styles.loginBack}
          onClick={() => {
            setAuthMode("login");
            setFormError(null);
          }}
        >
          ← Ко входу
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void handleForgotPasswordSubmit(e)} noValidate>
      <p className={styles.loginHint}>
        Учётная запись: <strong>{forgotEmail.trim()}</strong>
      </p>
      <p className={styles.loginHint} style={{ marginBottom: 14 }}>
        {PASSWORD_RULES_SHORT}
      </p>
      <label className={styles.loginLabel} htmlFor="page3-forgot-pw">
        Новый пароль
      </label>
      <div className={styles.loginPasswordRow}>
        <input
          id="page3-forgot-pw"
          type={showForgotPassword ? "text" : "password"}
          className={styles.loginInput}
          value={forgotPassword}
          onChange={(e) => setForgotPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Page3PasswordEyeButton
          showPassword={showForgotPassword}
          onToggle={() => setShowForgotPassword((v) => !v)}
        />
      </div>
      <label className={styles.loginLabel} htmlFor="page3-forgot-pw2">
        Повторите пароль
      </label>
      <input
        id="page3-forgot-pw2"
        type="password"
        className={styles.loginInput}
        value={forgotPassword2}
        onChange={(e) => setForgotPassword2(e.target.value)}
        autoComplete="new-password"
      />
      <button type="submit" className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}>
        Сохранить новый пароль
      </button>
      <button
        type="button"
        className={styles.loginBack}
        onClick={() => {
          setForgotStep("email");
          setFormError(null);
        }}
      >
        ← Назад
      </button>
    </form>
  );
}
