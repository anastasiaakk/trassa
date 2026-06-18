import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { NavigateFunction } from "react-router-dom";
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
import { validatePasswordPolicy } from "../utils/passwordPolicy";
import {
  loadContractorOrganizations,
  normalizeOrgName,
  resolveOrganizationFromInput,
} from "../utils/contractorOrganizations";
import {
  clearCabinetBetaPreview,
  startCabinetBetaPreview,
} from "../utils/cabinetBetaPreview";
import { contractorOrgValidationMessage } from "../utils/roleSelectAuth";

export type RoleSelectAuthMode = "login" | "register" | "forgot";

type useRoleSelectAuthParams = {
  selectedRole: number | null;
  showLogin: boolean;
  navigate: NavigateFunction;
  setIsNavigating: (value: boolean) => void;
};

export function useRoleSelectAuth({
  selectedRole,
  showLogin,
  navigate,
  setIsNavigating,
}: useRoleSelectAuthParams) {
  const [institutionProfile, setInstitutionProfile] = useState<"ado" | "rador">("rador");
  const [authMode, setAuthMode] = useState<RoleSelectAuthMode>("login");
  const [forgotStep, setForgotStep] = useState<"email" | "password">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
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
  const [contractorOrgName, setContractorOrgName] = useState("");
  const [specializationId, setSpecializationId] = useState("");
  const [regRegisterTab, setRegRegisterTab] = useState<"profile" | "spec">("profile");
  const [contractorOrgs, setContractorOrgs] = useState<string[]>(() => loadContractorOrganizations());

  const needsSpecialization = selectedRole === 1 || selectedRole === 2;
  const authApiMode = isAuthApiEnabled();

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

  const resetAuth = useCallback(() => {
    clearCabinetBetaPreview();
    setContractorOrgName("");
    setInstitutionProfile("rador");
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
  }, [selectedRole, institutionProfile, navigate, setIsNavigating]);

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
    [
      reg,
      goCabinet,
      selectedRole,
      contractorOrgs,
      contractorOrgName,
      authApiMode,
      needsSpecialization,
      specializationId,
    ]
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

  return {
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
    resetAuth,
    goCabinetBetaPreview,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleForgotEmailNext,
    handleForgotPasswordSubmit,
  };
}

export type RoleSelectAuthState = ReturnType<typeof useRoleSelectAuth>;
