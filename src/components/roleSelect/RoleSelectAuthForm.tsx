import { getLoginBadgeText } from "../../config/roleSelectRoles";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { RoleSelectAuthState } from "../../hooks/useRoleSelectAuth";
import styles from "../../pages/RoleSelectPage.module.css";
import RoleSelectForgotPasswordSection from "./RoleSelectForgotPasswordSection";
import RoleSelectInstitutionProfilePicker from "./RoleSelectInstitutionProfilePicker";
import RoleSelectLoginFormSection from "./RoleSelectLoginFormSection";
import RoleSelectRegisterFormSection from "./RoleSelectRegisterFormSection";

type RoleSelectAuthFormProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: RoleSelectAuthState;
};

export default function RoleSelectAuthForm({ isV2, selectedRole, auth }: RoleSelectAuthFormProps) {
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

            <RoleSelectInstitutionProfilePicker isV2={isV2} selectedRole={selectedRole} auth={auth} />

            {authMode === "login" ? (
              <RoleSelectLoginFormSection isV2={isV2} selectedRole={selectedRole} auth={auth} />
            ) : null}

            {authMode === "register" ? (
              <RoleSelectRegisterFormSection isV2={isV2} selectedRole={selectedRole} auth={auth} />
            ) : null}

            {authMode === "forgot" ? <RoleSelectForgotPasswordSection isV2={isV2} auth={auth} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
