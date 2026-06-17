import {
  saveProfileSettings,
  type ProfileSettingsData,
} from "../profileSettingsStorage";

export const CABINET_BETA_PREVIEW_KEY = "trassa-cabinet-beta-preview";

export function isCabinetBetaPreview(): boolean {
  try {
    return sessionStorage.getItem(CABINET_BETA_PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCabinetBetaPreview(active: boolean): void {
  try {
    if (active) sessionStorage.setItem(CABINET_BETA_PREVIEW_KEY, "1");
    else sessionStorage.removeItem(CABINET_BETA_PREVIEW_KEY);
  } catch {
    /* ignore */
  }
}

export function clearCabinetBetaPreview(): void {
  setCabinetBetaPreview(false);
}

type BetaPreviewOptions = {
  institutionProfile?: "ado" | "rador";
  contractorOrg?: string;
};

function demoProfileForRole(
  role: number,
  options: BetaPreviewOptions
): ProfileSettingsData {
  const institutionProfile = options.institutionProfile ?? "rador";
  const base = {
    messengerUid: `beta-preview-role-${role}`,
    notifyEmail: false,
    notifyPush: false,
    specializationId: "",
    phone: "+7 (900) 000-00-00",
  };

  if (role === 0) {
    return {
      ...base,
      firstName: "Иван",
      lastName: "Школьников",
      roleLabel: "Школьник",
      contractorCompanyName: "",
      email: "beta-school@preview.trassa",
    };
  }
  if (role === 1) {
    return {
      ...base,
      firstName: "Анна",
      lastName: "Студентова",
      roleLabel: "Студент",
      contractorCompanyName: "",
      email: "beta-spo@preview.trassa",
    };
  }
  if (role === 2) {
    return {
      ...base,
      firstName: "Дмитрий",
      lastName: "Подрядов",
      roleLabel: "Координатор проектов",
      contractorCompanyName: options.contractorOrg?.trim() ?? "Демо-организация",
      email: "beta-contractor@preview.trassa",
    };
  }
  if (institutionProfile === "ado") {
    return {
      ...base,
      firstName: "Елена",
      lastName: "Администраторова",
      roleLabel: "Специалист АДО",
      contractorCompanyName: "",
      email: "beta-ado@preview.trassa",
    };
  }
  return {
    ...base,
    firstName: "Сергей",
    lastName: "Радоров",
    roleLabel: "Аналитик РАДОР",
    contractorCompanyName: "",
    email: "beta-rador@preview.trassa",
  };
}

/** Демо-профиль и флаг сессии для ознакомительного входа без учётной записи. */
export function startCabinetBetaPreview(role: number, options: BetaPreviewOptions = {}): void {
  saveProfileSettings(demoProfileForRole(role, options));
  setCabinetBetaPreview(true);
}
