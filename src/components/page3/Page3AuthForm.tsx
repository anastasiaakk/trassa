import { getLoginBadgeText } from "../../config/page3Roles";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { Page3AuthState } from "../../hooks/usePage3Auth";
import styles from "../../pages/Page3.module.css";
import Page3ForgotPasswordSection from "./Page3ForgotPasswordSection";
import Page3InstitutionProfilePicker from "./Page3InstitutionProfilePicker";
import Page3LoginFormSection from "./Page3LoginFormSection";
import Page3RegisterFormSection from "./Page3RegisterFormSection";

type Page3AuthFormProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: Page3AuthState;
};

export default function Page3AuthForm({ isV2, selectedRole, auth }: Page3AuthFormProps) {
  const { institutionProfile, authMode, forgotStep, formError } = auth;

  return (
    <div className={styles.loginCardWrap}>
      <div className={cx(isV2 && "page3-v2__login-shell")}>
        <div
          className={cx(
            styles.loginCard,
            authMode === "register" && styles.loginCardTallForm,
            isV2 && "page3-v2__login-card"
          )}
        >
          <div className={styles.loginCardHeader}>
            <span className={styles.loginBadge}>
              {getLoginBadgeText(selectedRole, institutionProfile)}
            </span>
            <h2 className={styles.loginTitle}>
              {authMode === "login" && "Вход в систему"}
              {authMode === "register" && "Регистрация"}
              {authMode === "forgot" && forgotStep === "email" && "Восстановление пароля"}
              {authMode === "forgot" && forgotStep === "password" && "Новый пароль"}
            </h2>
            {authMode !== "login" ? (
              <p className={styles.loginSubtitle}>
                {authMode === "register" &&
                  "Эти данные сохранятся в личном кабинете в разделе «Настройки профиля»"}
                {authMode === "forgot" &&
                  forgotStep === "email" &&
                  "Укажите e-mail, с которым вы регистрировались"}
                {authMode === "forgot" &&
                  forgotStep === "password" &&
                  "Задайте новый пароль для входа в портал"}
              </p>
            ) : null}
          </div>
          <div
            className={`${styles.loginCardBody} ${authMode === "register" ? styles.loginCardBodyScroll : ""}`}
          >
            {formError ? (
              <p className={styles.loginError} role="alert">
                {formError}
              </p>
            ) : null}

            <Page3InstitutionProfilePicker isV2={isV2} selectedRole={selectedRole} auth={auth} />

            {authMode === "login" ? (
              <Page3LoginFormSection isV2={isV2} selectedRole={selectedRole} auth={auth} />
            ) : null}

            {authMode === "register" ? (
              <Page3RegisterFormSection isV2={isV2} selectedRole={selectedRole} auth={auth} />
            ) : null}

            {authMode === "forgot" ? <Page3ForgotPasswordSection isV2={isV2} auth={auth} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
