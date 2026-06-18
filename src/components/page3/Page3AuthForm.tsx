import ContractorOrgPicker from "../ContractorOrgPicker";
import SpecializationPicker from "../SpecializationPicker";
import { getLoginBadgeText } from "../../config/page3Roles";
import { cx } from "../../design-system/cabinetChromeClasses";
import type { Page3AuthState } from "../../hooks/usePage3Auth";
import { PASSWORD_RULES_SHORT } from "../../utils/passwordPolicy";
import styles from "../../pages/Page3.module.css";

type Page3AuthFormProps = {
  isV2: boolean;
  selectedRole: number | null;
  auth: Page3AuthState;
};

export default function Page3AuthForm({ isV2, selectedRole, auth }: Page3AuthFormProps) {
  const {
    institutionProfile,
    setInstitutionProfile,
    authMode,
    setAuthMode,
    forgotStep,
    setForgotStep,
    loginEmail,
    setLoginEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    showRegPassword,
    setShowRegPassword,
    formError,
    setFormError,
    regPasswordError,
    setRegPasswordError,
    reg,
    setReg,
    forgotEmail,
    setForgotEmail,
    forgotPassword,
    setForgotPassword,
    forgotPassword2,
    setForgotPassword2,
    showForgotPassword,
    setShowForgotPassword,
    contractorOrgName,
    setContractorOrgName,
    specializationId,
    setSpecializationId,
    regRegisterTab,
    setRegRegisterTab,
    contractorOrgs,
    needsSpecialization,
    goCabinetBetaPreview,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleForgotEmailNext,
    handleForgotPasswordSubmit,
  } = auth;

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

            {selectedRole === 3 ? (
              <div className={styles.loginProfileBlock} role="radiogroup" aria-label="Профиль входа">
                <span className={styles.loginLabel} id="page3-profile-label">
                  Профиль кабинета
                </span>
                <div className={styles.loginProfileRow} aria-labelledby="page3-profile-label">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={institutionProfile === "ado"}
                    className={cx(
                      styles.loginProfileBtn,
                      isV2 && "page3-v2__profile-btn",
                      institutionProfile === "ado" && styles.loginProfileBtnActive,
                      isV2 && institutionProfile === "ado" && "page3-v2__profile-btn--active"
                    )}
                    onClick={() => setInstitutionProfile("ado")}
                  >
                    АДО
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={institutionProfile === "rador"}
                    className={cx(
                      styles.loginProfileBtn,
                      isV2 && "page3-v2__profile-btn",
                      institutionProfile === "rador" && styles.loginProfileBtnActive,
                      isV2 && institutionProfile === "rador" && "page3-v2__profile-btn--active"
                    )}
                    onClick={() => setInstitutionProfile("rador")}
                  >
                    РАДОР
                  </button>
                </div>
              </div>
            ) : null}

            {authMode === "login" ? (
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
                        Список организаций пуст. Администратор должен добавить названия в панели
                        управления — без этого вход в кабинет подрядчика недоступен.
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
                  <button
                    type="button"
                    className={styles.loginEyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    <svg className={styles.loginEyeIcon} viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M12 6c3.79 0 7.17 1.94 9 5-1.83 3.06-5.21 5-9 5s-7.17-1.94-9-5c1.83-3.06 5.21-5 9-5zm0 2.5A4.5 4.5 0 0 0 7.5 13 4.5 4.5 0 0 0 12 17.5 4.5 4.5 0 0 0 16.5 13 4.5 4.5 0 0 0 12 8.5zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
                      />
                      {showPassword ? (
                        <line
                          x1="4"
                          y1="4"
                          x2="20"
                          y2="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      ) : null}
                    </svg>
                  </button>
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
            ) : null}

            {authMode === "register" ? (
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
                        isV2 && "page3-v2__profile-btn",
                        regRegisterTab === "profile" && styles.loginProfileBtnActive,
                        isV2 && regRegisterTab === "profile" && "page3-v2__profile-btn--active"
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
                        isV2 && "page3-v2__profile-btn",
                        regRegisterTab === "spec" && styles.loginProfileBtnActive,
                        isV2 && regRegisterTab === "spec" && "page3-v2__profile-btn--active"
                      )}
                      onClick={() => setRegRegisterTab("spec")}
                    >
                      Спецификация
                    </button>
                  </div>
                ) : null}

                {regRegisterTab === "spec" && needsSpecialization ? (
                  <SpecializationPicker
                    value={specializationId}
                    onChange={setSpecializationId}
                    required
                  />
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
                            Список организаций пуст. Регистрация подрядчика станет доступна после того,
                            как администратор добавит организации.
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
                      <button
                        type="button"
                        className={styles.loginEyeBtn}
                        onClick={() => setShowRegPassword((v) => !v)}
                        aria-label={showRegPassword ? "Скрыть пароль" : "Показать пароль"}
                      >
                        <svg className={styles.loginEyeIcon} viewBox="0 0 24 24" aria-hidden>
                          <path
                            fill="currentColor"
                            d="M12 6c3.79 0 7.17 1.94 9 5-1.83 3.06-5.21 5-9 5s-7.17-1.94-9-5c1.83-3.06 5.21-5 9-5zm0 2.5A4.5 4.5 0 0 0 7.5 13 4.5 4.5 0 0 0 12 17.5 4.5 4.5 0 0 0 16.5 13 4.5 4.5 0 0 0 12 8.5zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
                          />
                          {showRegPassword ? (
                            <line
                              x1="4"
                              y1="4"
                              x2="20"
                              y2="20"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          ) : null}
                        </svg>
                      </button>
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
                        className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}
                        onClick={() => {
                          setFormError(null);
                          setRegRegisterTab("spec");
                        }}
                      >
                        Далее: спецификация →
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}
                      >
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
                    <button
                      type="submit"
                      className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}
                    >
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
            ) : null}

            {authMode === "forgot" && forgotStep === "email" ? (
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
            ) : null}

            {authMode === "forgot" && forgotStep === "password" ? (
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
                  <button
                    type="button"
                    className={styles.loginEyeBtn}
                    onClick={() => setShowForgotPassword((v) => !v)}
                    aria-label={showForgotPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    <svg className={styles.loginEyeIcon} viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M12 6c3.79 0 7.17 1.94 9 5-1.83 3.06-5.21 5-9 5s-7.17-1.94-9-5c1.83-3.06 5.21-5 9-5zm0 2.5A4.5 4.5 0 0 0 7.5 13 4.5 4.5 0 0 0 12 17.5 4.5 4.5 0 0 0 16.5 13 4.5 4.5 0 0 0 12 8.5zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
                      />
                      {showForgotPassword ? (
                        <line
                          x1="4"
                          y1="4"
                          x2="20"
                          y2="20"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      ) : null}
                    </svg>
                  </button>
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
