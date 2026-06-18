import ContractorOrgPicker from "../ContractorOrgPicker";
import SpecializationPicker from "../SpecializationPicker";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { RoleSelectAuthState } from "../../hooks/useRoleSelectAuth";
import { PASSWORD_RULES_SHORT } from "../../utils/passwordPolicy";
import styles from "../../pages/RoleSelectPage.module.css";
import RoleSelectPasswordEyeButton from "./RoleSelectPasswordEyeButton";

type RoleSelectRegisterFormSectionProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: RoleSelectAuthState;
};

export default function RoleSelectRegisterFormSection({
  isV2,
  selectedRole,
  auth,
}: RoleSelectRegisterFormSectionProps) {
  const {
    setAuthMode,
    setFormError,
    regPasswordError,
    setRegPasswordError,
    reg,
    setReg,
    showRegPassword,
    setShowRegPassword,
    contractorOrgName,
    setContractorOrgName,
    specializationId,
    setSpecializationId,
    regRegisterTab,
    setRegRegisterTab,
    contractorOrgs,
    needsSpecialization,
    handleRegisterSubmit,
  } = auth;

  return (
    <form onSubmit={(e) => void handleRegisterSubmit(e)} noValidate>
      {needsSpecialization ? (
        <div
          className={styles.loginProfileRow}
          style={{ marginBottom: 14 }}
          role="tablist"
          aria-label="Шаги регистрации"
        >
          <button
            type="button"
            role="tab"
            aria-selected={regRegisterTab === "profile"}
            className={cx(
              styles.loginProfileBtn,
              isV2 && "role-select-v2__profile-btn",
              regRegisterTab === "profile" && styles.loginProfileBtnActive,
              isV2 && regRegisterTab === "profile" && "role-select-v2__profile-btn--active"
            )}
            onClick={() => setRegRegisterTab("profile")}
          >
            Данные
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={regRegisterTab === "spec"}
            className={cx(
              styles.loginProfileBtn,
              isV2 && "role-select-v2__profile-btn",
              regRegisterTab === "spec" && styles.loginProfileBtnActive,
              isV2 && regRegisterTab === "spec" && "role-select-v2__profile-btn--active"
            )}
            onClick={() => setRegRegisterTab("spec")}
          >
            Спецификация
          </button>
        </div>
      ) : null}

      {regRegisterTab === "spec" && needsSpecialization ? (
        <SpecializationPicker value={specializationId} onChange={setSpecializationId} required />
      ) : null}

      {regRegisterTab === "profile" || !needsSpecialization ? (
        <>
          <label className={styles.loginLabel} htmlFor="page3-reg-first">
            Имя
          </label>
          <input
            id="page3-reg-first"
            className={styles.loginInput}
            value={reg.firstName}
            onChange={(e) => setReg((p) => ({ ...p, firstName: e.target.value }))}
            autoComplete="given-name"
          />
          <label className={styles.loginLabel} htmlFor="page3-reg-last">
            Фамилия
          </label>
          <input
            id="page3-reg-last"
            className={styles.loginInput}
            value={reg.lastName}
            onChange={(e) => setReg((p) => ({ ...p, lastName: e.target.value }))}
            autoComplete="family-name"
          />
          {selectedRole !== 0 && selectedRole !== 1 ? (
            <>
              <label className={styles.loginLabel} htmlFor="page3-reg-role">
                Должность / роль в системе
              </label>
              <input
                id="page3-reg-role"
                className={styles.loginInput}
                placeholder="Например, координатор"
                value={reg.roleLabel}
                onChange={(e) => setReg((p) => ({ ...p, roleLabel: e.target.value }))}
              />
            </>
          ) : null}
          <label className={styles.loginLabel} htmlFor="page3-reg-email">
            Электронная почта (будет логином)
          </label>
          <input
            id="page3-reg-email"
            type="email"
            className={styles.loginInput}
            placeholder="например@mail.ru"
            value={reg.email}
            onChange={(e) => setReg((p) => ({ ...p, email: e.target.value }))}
            autoComplete="email"
          />
          <label className={styles.loginLabel} htmlFor="page3-reg-phone">
            Телефон
          </label>
          <input
            id="page3-reg-phone"
            type="tel"
            className={styles.loginInput}
            placeholder="+7 …"
            value={reg.phone}
            onChange={(e) => setReg((p) => ({ ...p, phone: e.target.value }))}
            autoComplete="tel"
          />

          {selectedRole === 2 ? (
            <>
              {contractorOrgs.length === 0 ? (
                <p className={styles.loginHint} role="status">
                  Список организаций пуст. Регистрация подрядчика станет доступна после того, как
                  администратор добавит организации.
                </p>
              ) : null}
              <ContractorOrgPicker
                id="page3-contractor-org-reg"
                organizations={contractorOrgs}
                value={contractorOrgName}
                onChange={setContractorOrgName}
                disabled={contractorOrgs.length === 0}
                label="Организация"
              />
            </>
          ) : null}

          <p className={styles.loginHint} style={{ marginBottom: 14 }}>
            {PASSWORD_RULES_SHORT} Уведомления можно включить позже в настройках профиля.
          </p>
          <label className={styles.loginLabel} htmlFor="page3-reg-pw">
            Пароль
          </label>
          <div className={styles.loginPasswordRow}>
            <input
              id="page3-reg-pw"
              type={showRegPassword ? "text" : "password"}
              className={styles.loginInput}
              value={reg.password}
              onChange={(e) => {
                setReg((p) => ({ ...p, password: e.target.value }));
                setRegPasswordError(null);
              }}
              aria-invalid={Boolean(regPasswordError)}
              aria-describedby={regPasswordError ? "page3-reg-pw-error" : undefined}
              autoComplete="new-password"
            />
            <RoleSelectPasswordEyeButton
              showPassword={showRegPassword}
              onToggle={() => setShowRegPassword((v) => !v)}
            />
          </div>
          <label className={styles.loginLabel} htmlFor="page3-reg-pw2">
            Повторите пароль
          </label>
          <input
            id="page3-reg-pw2"
            type="password"
            className={styles.loginInput}
            value={reg.password2}
            onChange={(e) => {
              setReg((p) => ({ ...p, password2: e.target.value }));
              setRegPasswordError(null);
            }}
            aria-invalid={Boolean(regPasswordError)}
            aria-describedby={regPasswordError ? "page3-reg-pw-error" : undefined}
            autoComplete="new-password"
          />
          {regPasswordError ? (
            <p id="page3-reg-pw-error" className={styles.loginFieldError} role="alert">
              {regPasswordError}
            </p>
          ) : null}

          {needsSpecialization ? (
            <button
              type="button"
              className={cx(styles.loginSubmit, isV2 && "role-select-v2__primary-btn")}
              onClick={() => {
                setFormError(null);
                setRegRegisterTab("spec");
              }}
            >
              Далее: спецификация →
            </button>
          ) : (
            <button type="submit" className={cx(styles.loginSubmit, isV2 && "role-select-v2__primary-btn")}>
              Зарегистрироваться и войти
            </button>
          )}
        </>
      ) : null}

      {regRegisterTab === "spec" && needsSpecialization ? (
        <>
          <button
            type="button"
            className={styles.loginLinkBtn}
            style={{ marginBottom: 12 }}
            onClick={() => setRegRegisterTab("profile")}
          >
            ← Назад к данным
          </button>
          <button type="submit" className={cx(styles.loginSubmit, isV2 && "role-select-v2__primary-btn")}>
            Зарегистрироваться и войти
          </button>
        </>
      ) : null}

      <div className={styles.loginLinkRow}>
        Уже есть аккаунт?{" "}
        <button
          type="button"
          className={styles.loginLinkBtn}
          onClick={() => {
            setAuthMode("login");
            setFormError(null);
            setRegPasswordError(null);
            window.requestAnimationFrame(() => {
              document.getElementById("page3-email")?.focus({ preventScroll: true });
            });
          }}
        >
          Войти
        </button>
      </div>
    </form>
  );
}
