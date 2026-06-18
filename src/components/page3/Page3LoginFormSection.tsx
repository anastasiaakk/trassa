import ContractorOrgPicker from "../ContractorOrgPicker";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { Page3AuthState } from "../../hooks/usePage3Auth";
import styles from "../../pages/Page3.module.css";
import Page3PasswordEyeButton from "./Page3PasswordEyeButton";

type Page3LoginFormSectionProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: Page3AuthState;
};

export default function Page3LoginFormSection({ isV2, selectedRole, auth }: Page3LoginFormSectionProps) {
  const {
    loginEmail,
    setLoginEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    setAuthMode,
    setFormError,
    setRegPasswordError,
    setForgotStep,
    setForgotEmail,
    contractorOrgName,
    setContractorOrgName,
    contractorOrgs,
    goCabinetBetaPreview,
    handleLoginSubmit,
  } = auth;

  return (
    <form onSubmit={(e) => void handleLoginSubmit(e)} noValidate>
      <label className={styles.loginLabel} htmlFor="page3-email">
        Электронная почта (логин)
      </label>
      <input
        id="page3-email"
        name="email"
        type="email"
        className={styles.loginInput}
        placeholder="например@mail.ru"
        value={loginEmail}
        onChange={(ev) => setLoginEmail(ev.target.value)}
        autoComplete="username"
      />

      {selectedRole === 2 ? (
        <>
          {contractorOrgs.length === 0 ? (
            <p className={styles.loginHint} role="status">
              Список организаций пуст. Администратор должен добавить названия в панели управления — без
              этого вход в кабинет подрядчика недоступен.
            </p>
          ) : null}
          <ContractorOrgPicker
            id="page3-contractor-org-login"
            organizations={contractorOrgs}
            value={contractorOrgName}
            onChange={setContractorOrgName}
            disabled={contractorOrgs.length === 0}
            label="Организация"
          />
        </>
      ) : null}

      <label className={styles.loginLabel} htmlFor="page3-password">
        Пароль
      </label>
      <div className={styles.loginPasswordRow}>
        <input
          id="page3-password"
          name="password"
          type={showPassword ? "text" : "password"}
          className={styles.loginInput}
          placeholder="Введите пароль"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          autoComplete="current-password"
        />
        <Page3PasswordEyeButton
          showPassword={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />
      </div>

      <button type="submit" className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}>
        Войти
      </button>
      <div className={styles.loginAuthSecondaryRow}>
        <button
          type="button"
          className={cx(styles.loginBetaPreview, isV2 && "page3-v2__beta-btn")}
          onClick={goCabinetBetaPreview}
        >
          Бета-просмотр
        </button>
        <button
          type="button"
          className={cx(styles.loginRegisterBtn, isV2 && "page3-v2__register-btn")}
          onClick={() => {
            setAuthMode("register");
            setFormError(null);
            setRegPasswordError(null);
          }}
        >
          Регистрация
        </button>
      </div>
      <button
        type="button"
        className={styles.loginForgot}
        onClick={() => {
          setAuthMode("forgot");
          setForgotStep("email");
          setForgotEmail(loginEmail.trim());
          setFormError(null);
        }}
      >
        Забыли пароль?
      </button>
    </form>
  );
}
