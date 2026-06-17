import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  memo,
  KeyboardEvent,
  MouseEvent,
  FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  loadProfileSettings,
  saveProfileSettings,
  type ProfileSettingsData,
} from "../profileSettingsStorage";
import { authLogin, authRegister } from "../api/authApi";
import {
  isEmailRegistered,
  isLegacyLoginAllowed,
  loginWithEmailPassword,
  registerUser,
  resetPasswordForEmail,
} from "../utils/localAuth";
import { isAuthApiEnabled } from "../utils/authMode";
import { PASSWORD_RULES_SHORT, validatePasswordPolicy } from "../utils/passwordPolicy";
import SpecializationPicker from "../components/SpecializationPicker";
import {
  loadContractorOrganizations,
  normalizeOrgName,
  resolveOrganizationFromInput,
} from "../utils/contractorOrganizations";
import { injectImagePreloads } from "../utils/imagePreload";
import {
  ADMIN_CABINET_SEARCH,
  shouldShowReturnToAdminDashboard,
} from "../utils/adminReturnNavigation";
import {
  clearCabinetBetaPreview,
  startCabinetBetaPreview,
} from "../utils/cabinetBetaPreview";
import ContractorOrgPicker from "../components/ContractorOrgPicker";
import { cx } from "../design-system/cabinetChromeClasses";
import { usePortalDesign } from "../design-system/usePortalDesign";
import styles from "./Page3.module.css";
import {
  ROLE_ICON_CONTRACTOR,
  ROLE_ICON_INSTITUTION,
  ROLE_ICON_SCHOOL,
  ROLE_ICON_STUDENT,
} from "../assets/appIcons";

function contractorOrgValidationMessage(
  selectedRole: number | null,
  orgs: string[],
  name: string
): string | null {
  if (selectedRole !== 2) return null;
  if (orgs.length === 0) {
    return "Список организаций пуст. Администратор должен добавить организации — без этого вход в кабинет подрядчика невозможен.";
  }
  if (!resolveOrganizationFromInput(name, orgs)) {
    return "Выберите организацию из списка или введите название точно как в списке.";
  }
  return null;
}

const firstCardPhoto = new URL("../assets/школьник.png", import.meta.url).href;
const secondCardPhoto = new URL("../assets/студент.png", import.meta.url).href;
const thirdCardPhoto = new URL("../assets/подрядчик.png", import.meta.url).href;
const fourthCardPhoto = new URL("../assets/админ.png", import.meta.url).href;
/** Второе состояние карточки «Институты» — широкий кадр, как у остальных ролей */
const fourthCardExpandedPhoto = new URL("../assets/admin-photo.png", import.meta.url).href;
const firstCardExpandedPhoto = new URL("../assets/page3-expanded-role1.png", import.meta.url).href;
const secondCardExpandedPhoto = new URL("../assets/page3-expanded-role2.png", import.meta.url).href;
const thirdCardExpandedPhoto = new URL("../assets/page3-expanded-role3.png", import.meta.url).href;
const firstCardIcon = ROLE_ICON_SCHOOL;

const ROLE_HOVER_OVERLAY_SRC = [
  firstCardExpandedPhoto,
  secondCardExpandedPhoto,
  thirdCardExpandedPhoto,
  fourthCardExpandedPhoto,
] as const;

/** Кадр фона во второй развёртке */
const ROLE_EXPAND_BG = [
  { position: "center 42%", scale: "1.12" },
  { position: "center 42%", scale: "1.12" },
  { position: "center 42%", scale: "1.12" },
  { position: "center 42%", scale: "1.12" },
] as const;

const ROLE_FEATURE_COPY = [
  {
    title: "Школьник",
    subtitle: "Строительство дорожного дела и помощь от родителей",
  },
  {
    title: "Студент",
    subtitle: "Республиканские олимпиады, своё портфолио и наставники",
  },
  {
    title: "Подрядчик",
    subtitle: "Поддержка в реализации и дорожные проекты",
  },
  {
    title: "Государственные институты",
    subtitle: "Мониторинг состояния и поддержка федеральных программ",
  },
] as const;

/** Плашка над формой входа: для РАДОР — «Государственные институты», для АДО — «АДО»; остальные роли — свои заголовки. */
function getLoginBadgeText(
  selectedRole: number | null,
  institutionProfile: "ado" | "rador"
): string {
  if (selectedRole === 3) {
    return institutionProfile === "rador" ? "Государственные институты" : "АДО";
  }
  if (selectedRole === 0) return "Школа";
  if (selectedRole === 1) return "СПО и ВО";
  if (selectedRole === 2) return "Подрядные организации";
  return "Государственные институты";
}

const PAGE3_PRELOAD_IMAGES = [
  firstCardIcon,
  ROLE_ICON_STUDENT,
  ROLE_ICON_CONTRACTOR,
  ROLE_ICON_INSTITUTION,
  firstCardPhoto,
  secondCardPhoto,
  thirdCardPhoto,
  firstCardExpandedPhoto,
  secondCardExpandedPhoto,
  thirdCardExpandedPhoto,
  fourthCardPhoto,
  fourthCardExpandedPhoto,
] as const;

const roleIcons = [
  {
    iconSrc: firstCardIcon,
    overlay: true,
    overlaySrc: firstCardPhoto,
    alt: "Роль 1",
  },
  {
    iconSrc: ROLE_ICON_STUDENT,
    overlay: true,
    overlaySrc: secondCardPhoto,
    alt: "Роль 2",
  },
  {
    iconSrc: ROLE_ICON_CONTRACTOR,
    overlay: true,
    overlaySrc: thirdCardPhoto,
    alt: "Роль 3",
  },
  {
    iconSrc: ROLE_ICON_INSTITUTION,
    overlay: true,
    overlaySrc: fourthCardPhoto,
    alt: "Роль 4",
  },
] as const;

type RoleIcon = (typeof roleIcons)[number];

type RoleCardProps = {
  icon: RoleIcon;
  index: number;
  isSelected: boolean;
  isV2?: boolean;
  onSelect: (index: number) => void;
  /** После снятия выбора — сброс «ховер-блока» при уходе курсора с карточки */
  onLeave?: () => void;
};

const RoleCard = memo(({ icon, index, isSelected, isV2 = false, onSelect, onLeave }: RoleCardProps) => {
  const hoverOverlaySrc = ROLE_HOVER_OVERLAY_SRC[index];
  const expandBg = ROLE_EXPAND_BG[index];
  const featureCopy = ROLE_FEATURE_COPY[index];
  const isExpanded = isSelected;
  const expandPanelStyle = {
    ["--institutions-hover-overlay" as string]: `url(${hoverOverlaySrc})`,
    ["--institutions-bg-position" as string]: expandBg.position,
    ["--institutions-bg-scale" as string]: expandBg.scale,
  };

  const handleDivClick = useCallback(
    () => onSelect(index),
    [index, onSelect]
  );

  const handleDivKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(index);
      }
    },
    [index, onSelect]
  );

  const handleButtonClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onSelect(index);
    },
    [index, onSelect]
  );

  return (
    <div
      className={cx(
        styles.roleCard,
        isSelected && styles.roleCardSelected,
        styles.roleCardInstitutions,
        isExpanded && styles.roleCardInstitutionsExpanded,
        isV2 && "page3-v2__role-card",
        isV2 && isSelected && "page3-v2__role-card--selected"
      )}
      data-role-index={index}
      onClick={handleDivClick}
      onMouseLeave={onLeave}
      role="button"
      tabIndex={0}
      onKeyDown={handleDivKeyDown}
    >
      {icon.overlay && (
        <div
          className={cx(
            styles.cardOverlay,
            isSelected && styles.cardOverlaySelected,
            styles.cardOverlayInstitutions
          )}
          style={{
            backgroundImage: `url(${icon.overlaySrc})`,
            ["--institutions-hover-overlay" as string]: `url(${hoverOverlaySrc})`,
          }}
        />
      )}
      <div className={styles.cardContent}>
        <button
          type="button"
          className={styles.roleButton}
          onClick={handleButtonClick}
          aria-label={icon.alt}
        >
          <img
            decoding="async"
            src={icon.iconSrc}
            alt={icon.alt}
            className={`${styles.roleIcon} ${index === 1 ? styles.roleIconStudent : ""}`}
          />
        </button>
      </div>
      <div className={styles.institutionsHoverPanel} style={expandPanelStyle}>
        <div className={cx(styles.institutionsHoverShade, isV2 && "page3-v2__institutions-shade")} />
        <div className={styles.institutionsHoverMeta}>
          <span className={styles.institutionsHoverIconWrap}>
            <img decoding="async" src={icon.iconSrc} alt="" className={styles.institutionsHoverIcon} />
          </span>
          <div className={styles.institutionsHoverText}>
            <h3 className={styles.institutionsTitle}>{featureCopy.title}</h3>
            <p className={styles.institutionsSubtitle}>{featureCopy.subtitle}</p>
          </div>
        </div>
      </div>
      {isSelected && (
        <span className={cx(styles.selectedBadge, isV2 && "page3-v2__selected-badge")}>
          <span className={styles.selectedBadgeMark} aria-hidden>
            ✓
          </span>
          Выбрано
        </span>
      )}
    </div>
  );
});

/** Фоновая подложка без дорожной графики. */
const RoadIndustryNeoBackground = memo(({ isV2 = false }: { isV2?: boolean }) => (
  <div className={styles.roadIndustryBg} aria-hidden>
    <div className={cx(styles.neoAmbientWash, isV2 && "page3-v2__wash")} />
    <div className={cx(styles.neoAtmosphereGlow, isV2 && "page3-v2__glow")} />
  </div>
));

type AuthMode = "login" | "register" | "forgot";

const Page3 = () => {
  const isV2 = usePortalDesign() === "v2";
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  /** После снятия выбора кликом: первый заход курсора без эффекта hover, пока не уйдёт с карточки */
  const [roleHoverSuppressed, setRoleHoverSuppressed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  /** Сразу после выбора роли «Государственные институты» — форма входа на той же плашке */
  const [showLogin, setShowLogin] = useState(false);
  /** Профиль контура для роли «Государственные институты» (роль 4) */
  const [institutionProfile, setInstitutionProfile] = useState<"ado" | "rador">("rador");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [forgotStep, setForgotStep] = useState<"email" | "password">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Ошибки пароля при регистрации — показываются под полями пароля */
  const [regPasswordError, setRegPasswordError] = useState<string | null>(null);
  const [reg, setReg] = useState({
    firstName: "",
    lastName: "",
    roleLabel: "",
    email: "",
    phone: "",
    password: "",
    password2: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotPassword2, setForgotPassword2] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  /** Роль «Подрядчик» (2): выбор организации из справочника */
  const [contractorOrgName, setContractorOrgName] = useState("");
  const [specializationId, setSpecializationId] = useState("");
  const [regRegisterTab, setRegRegisterTab] = useState<"profile" | "spec">("profile");
  const needsSpecialization = selectedRole === 1 || selectedRole === 2;
  const [contractorOrgs, setContractorOrgs] = useState<string[]>(() => loadContractorOrganizations());
  const navigate = useNavigate();
  /** Вход через API (JWT cookie); см. `VITE_USE_AUTH_API` и прокси `/api`. */
  const authApiMode = isAuthApiEnabled();

  const goToPage2 = useCallback(() => {
    navigate("/services");
  }, [navigate]);

  const goToAdminCabinet = useCallback(() => {
    navigate({ pathname: "/services", search: `?${ADMIN_CABINET_SEARCH}` });
  }, [navigate]);

  useEffect(() => {
    void Promise.all([
      import("./Page4"),
      import("./Page5"),
      import("./Page6"),
      import("./ProfileSettings"),
      import("./CabinetSchool"),
      import("./CabinetSpo"),
    ]);
    return injectImagePreloads(PAGE3_PRELOAD_IMAGES);
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevDocOverflow;
    };
  }, []);

  /** Убирает «висящую» каретку перед плашкой: фокус сразу в поле e-mail при открытии входа */
  useEffect(() => {
    if (!showLogin) return;
    const t = window.setTimeout(() => {
      document.getElementById("page3-email")?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [showLogin]);

  useEffect(() => {
    if (showLogin) setContractorOrgs(loadContractorOrganizations());
  }, [showLogin, authMode]);

  useEffect(() => {
    if (selectedRole !== 2) setContractorOrgName("");
    if (selectedRole !== 1 && selectedRole !== 2) {
      setSpecializationId("");
      setRegRegisterTab("profile");
    }
  }, [selectedRole]);

  const handleRoleSelect = useCallback((index: number) => {
    setSelectedRole((prev) => {
      const next = prev === index ? null : index;
      queueMicrotask(() => {
        setRoleHoverSuppressed(prev === index);
      });
      return next;
    });
  }, []);

  const handleRoleCardLeave = useCallback(() => {
    setRoleHoverSuppressed(false);
  }, []);

  const handleNext = useCallback(() => {
    if (selectedRole === null) return;
    setShowLogin(true);
  }, [selectedRole]);

  const handleBackToRoles = useCallback(() => {
    clearCabinetBetaPreview();
    setShowLogin(false);
    setSelectedRole(null);
    setRoleHoverSuppressed(false);
    setContractorOrgName("");
    setInstitutionProfile("rador");
    try {
      sessionStorage.removeItem("trassaPortalRole");
    } catch {
      /* ignore */
    }
    setAuthMode("login");
    setForgotStep("email");
    setLoginEmail("");
    setPassword("");
    setShowPassword(false);
    setShowRegPassword(false);
    setFormError(null);
    setRegPasswordError(null);
    setReg({
      firstName: "",
      lastName: "",
      roleLabel: "",
      email: "",
      phone: "",
      password: "",
      password2: "",
    });
    setForgotEmail("");
    setForgotPassword("");
    setForgotPassword2("");
    setShowForgotPassword(false);
  }, []);

  const goCabinet = useCallback(() => {
    const role = selectedRole;
    if (role === null) return;
    try {
      sessionStorage.setItem("trassaPortalRole", String(role));
      if (role === 3) {
        sessionStorage.setItem("trassaInstitutionProfile", institutionProfile);
      } else {
        sessionStorage.removeItem("trassaInstitutionProfile");
      }
    } catch {
      /* ignore quota / private mode */
    }
    setIsNavigating(true);
    if (role === 0) {
      navigate("/cabinet-school");
      return;
    }
    if (role === 1) {
      navigate("/cabinet-spo");
      return;
    }
    if (role === 2) {
      navigate("/page4");
      return;
    }
    navigate(institutionProfile === "ado" ? "/page6" : "/page5");
  }, [selectedRole, institutionProfile, navigate]);

  const goCabinetBetaPreview = useCallback(() => {
    const role = selectedRole;
    if (role === null) return;
    setFormError(null);

    let contractorOrg: string | undefined;
    if (role === 2) {
      if (contractorOrgs.length === 0) {
        setFormError(
          "Бета-просмотр подрядчика недоступен: администратор ещё не добавил организации."
        );
        return;
      }
      contractorOrg =
        resolveOrganizationFromInput(contractorOrgName, contractorOrgs) ?? contractorOrgs[0];
    }

    startCabinetBetaPreview(role, { institutionProfile, contractorOrg });
    goCabinet();
  }, [selectedRole, institutionProfile, contractorOrgs, contractorOrgName, goCabinet]);

  const handleLoginSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      const email = loginEmail.trim();
      const p = password.trim();
      if (!email || !p) {
        setFormError("Введите e-mail и пароль.");
        return;
      }
      const orgErr = contractorOrgValidationMessage(selectedRole, contractorOrgs, contractorOrgName);
      if (orgErr) {
        setFormError(orgErr);
        return;
      }

      clearCabinetBetaPreview();

      if (authApiMode) {
        const res = await authLogin(email, p);
        if (!res.ok) {
          setFormError(res.error);
          return;
        }
        saveProfileSettings(res.profile);
        if (selectedRole === 2) {
          const picked = resolveOrganizationFromInput(contractorOrgName, contractorOrgs);
          if (!picked) {
            setFormError("Выберите организацию из списка.");
            return;
          }
          const saved = normalizeOrgName(res.profile.contractorCompanyName);
          if (saved !== normalizeOrgName(picked)) {
            setFormError(
              "Выбранная организация не совпадает с организацией, закреплённой за этой учётной записью."
            );
            return;
          }
        }
        goCabinet();
        return;
      }

      if (isLegacyLoginAllowed()) {
        if (selectedRole === 2) {
          const resolved = resolveOrganizationFromInput(contractorOrgName, contractorOrgs);
          if (!resolved) {
            setFormError("Выберите организацию из списка.");
            return;
          }
          const cur = loadProfileSettings();
          saveProfileSettings({ ...cur, contractorCompanyName: resolved });
        }
        goCabinet();
        return;
      }
      const res = await loginWithEmailPassword(email, p);
      if (!res.ok) {
        setFormError("Неверный e-mail или пароль.");
        return;
      }
      if (selectedRole === 2) {
        const picked = resolveOrganizationFromInput(contractorOrgName, contractorOrgs);
        if (!picked) {
          setFormError("Выберите организацию из списка.");
          return;
        }
        const saved = normalizeOrgName(res.profile.contractorCompanyName);
        if (saved !== normalizeOrgName(picked)) {
          setFormError(
            "Выбранная организация не совпадает с организацией, закреплённой за этой учётной записью."
          );
          return;
        }
      }
      goCabinet();
    },
    [loginEmail, password, goCabinet, selectedRole, contractorOrgs, contractorOrgName, authApiMode]
  );

  const handleRegisterSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      clearCabinetBetaPreview();
      setFormError(null);
      setRegPasswordError(null);
      if (reg.password !== reg.password2) {
        setRegPasswordError("Пароли не совпадают.");
        return;
      }
      const policyErr = validatePasswordPolicy(reg.password);
      if (policyErr) {
        setRegPasswordError(policyErr);
        return;
      }
      const orgErr = contractorOrgValidationMessage(selectedRole, contractorOrgs, contractorOrgName);
      if (orgErr) {
        setFormError(orgErr);
        return;
      }
      if (needsSpecialization && !specializationId.trim()) {
        setFormError("Выберите спецификацию (вкладка «Спецификация»).");
        setRegRegisterTab("spec");
        return;
      }
      const roleLabelResolved =
        selectedRole === 0
          ? "Школьник"
          : selectedRole === 1
            ? "Студент"
            : reg.roleLabel.trim() || "Участник";
      const profile: ProfileSettingsData = {
        firstName: reg.firstName.trim(),
        lastName: reg.lastName.trim(),
        roleLabel: roleLabelResolved,
        messengerUid: "",
        contractorCompanyName:
          selectedRole === 2
            ? resolveOrganizationFromInput(contractorOrgName, contractorOrgs) ?? ""
            : "",
        email: reg.email.trim(),
        phone: reg.phone.trim(),
        notifyEmail: true,
        notifyPush: false,
        specializationId: needsSpecialization ? specializationId.trim() : "",
      };
      if (authApiMode) {
        const result = await authRegister(reg.email.trim(), reg.password, profile);
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        saveProfileSettings(result.profile);
        goCabinet();
        return;
      }
      const result = await registerUser(profile, reg.password);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      goCabinet();
    },
    [reg, goCabinet, selectedRole, contractorOrgs, contractorOrgName, authApiMode, needsSpecialization, specializationId]
  );

  const handleForgotEmailNext = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      const em = forgotEmail.trim();
      if (!em || !em.includes("@")) {
        setFormError("Укажите корректный e-mail.");
        return;
      }
      if (!isEmailRegistered(em)) {
        setFormError("Аккаунт с таким e-mail не найден. Проверьте адрес или пройдите регистрацию.");
        return;
      }
      setForgotStep("password");
    },
    [forgotEmail]
  );

  const handleForgotPasswordSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setFormError(null);
      if (forgotPassword !== forgotPassword2) {
        setFormError("Пароли не совпадают.");
        return;
      }
      const forgotPolicyErr = validatePasswordPolicy(forgotPassword);
      if (forgotPolicyErr) {
        setFormError(forgotPolicyErr);
        return;
      }
      const res = await resetPasswordForEmail(forgotEmail.trim(), forgotPassword);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setAuthMode("login");
      setForgotStep("email");
      setLoginEmail(forgotEmail.trim());
      setPassword("");
      setForgotPassword("");
      setForgotPassword2("");
      setFormError(null);
    },
    [forgotEmail, forgotPassword, forgotPassword2]
  );

  const cards = useMemo(
    () =>
      roleIcons.map((icon, index) => (
        <RoleCard
          key={index}
          icon={icon}
          index={index}
          isSelected={selectedRole === index}
          isV2={isV2}
          onSelect={handleRoleSelect}
          onLeave={handleRoleCardLeave}
        />
      )),
    [selectedRole, handleRoleSelect, handleRoleCardLeave, isV2]
  );

  return (
    <div
      className={cx(styles.pageRoot, isNavigating && styles.pageRootNavigating, isV2 && "page3-v2")}
    >
      <RoadIndustryNeoBackground isV2={isV2} />
      <div
        className={cx(
          styles.hero,
          showLogin ? styles.heroAuthStep : styles.heroRolePick,
          isV2 && "page3-v2__role-tab page3-v2__role-panel"
        )}
      >
        <div className={cx(styles.decorLeft, isV2 && "page3-v2__decor")} />

        <div
          className={`${styles.content} ${showLogin ? styles.contentAuthStep : styles.contentRolePick}`}
        >
          {!showLogin ? (
            <>
              <div
                className={styles.backToPage2Wrap}
                style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
              >
                <button type="button" className={cx(styles.backToPage2, isV2 && "page3-v2__back")} onClick={goToPage2}>
                  ← Назад
                </button>
                {shouldShowReturnToAdminDashboard() ? (
                  <button
                    type="button"
                    className={cx(styles.backToPage2, isV2 && "page3-v2__back")}
                    onClick={goToAdminCabinet}
                  >
                    ← Кабинет администратора
                  </button>
                ) : null}
              </div>

              <div className={styles.rolePickMain}>
                <div className={styles.titleBlock}>
                  <h1 className={cx(styles.title, isV2 && "page3-v2__title")}>Выберите Роль</h1>
                  <p className={cx(styles.subtitle, isV2 && "page3-v2__subtitle")}>
                    Выберите категорию, соответствующую вашей деятельности
                  </p>
                </div>

                <div
                  className={cx(
                    styles.cardsRow,
                    roleHoverSuppressed && styles.cardsRowHoverSuppressed
                  )}
                >
                  {cards}
                </div>
                <div className={styles.nextSection}>
                  {selectedRole !== null && (
                    <button
                      type="button"
                      className={cx(styles.nextArrow, isV2 && "page3-v2__next")}
                      onClick={handleNext}
                      aria-label="Далее"
                    >
                      <svg className={styles.nextArrowIcon} viewBox="0 0 24 24" aria-hidden>
                        <path
                          fill="currentColor"
                          d="M13.025 5.4 19.65 12l-6.625 6.6-1.4-1.4 4.275-4.25H5v-2h10.9l-4.275-4.25 1.4-1.4Z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className={styles.backToPage2Wrap}
                style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
              >
                <button
                  type="button"
                  className={cx(styles.backToPage2, isV2 && "page3-v2__back")}
                  onClick={handleBackToRoles}
                >
                  ← К выбору роли
                </button>
                {shouldShowReturnToAdminDashboard() ? (
                  <button
                    type="button"
                    className={cx(styles.backToPage2, isV2 && "page3-v2__back")}
                    onClick={goToAdminCabinet}
                  >
                    ← Кабинет администратора
                  </button>
                ) : null}
              </div>
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
                      {authMode === "forgot" && forgotStep === "email" && "Укажите e-mail, с которым вы регистрировались"}
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
                    <div
                      className={styles.loginProfileBlock}
                      role="radiogroup"
                      aria-label="Профиль входа"
                    >
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
                        <button type="submit" className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}>
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
                          <button type="submit" className={cx(styles.loginSubmit, isV2 && "page3-v2__primary-btn")}>
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
            </>
          )}
        </div>

        <div className={styles.decorRight} />
      </div>
    </div>
  );
};

export default Page3;
