/**
 * Согласовано с клиентом: `my-react-app/src/profileSettingsStorage.ts`.
 * При добавлении полей — обновить оба файла и миграцию в `routes/auth.ts`.
 */

export type ProfileSettingsData = {
  firstName: string;
  lastName: string;
  roleLabel: string;
  /** Стабильный id для мессенджера */
  messengerUid: string;
  /** Наименование организации (кабинет подрядчика) */
  contractorCompanyName: string;
  email: string;
  phone: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  /** Специализация (студент / подрядчик) */
  specializationId: string;
};

export function defaultProfile(partial: Partial<ProfileSettingsData> & { email: string }): ProfileSettingsData {
  return {
    firstName: partial.firstName ?? "",
    lastName: partial.lastName ?? "",
    roleLabel: partial.roleLabel ?? "Организатор",
    messengerUid: partial.messengerUid ?? "",
    contractorCompanyName: partial.contractorCompanyName ?? "",
    email: partial.email.trim(),
    phone: partial.phone ?? "",
    notifyEmail: partial.notifyEmail ?? true,
    notifyPush: partial.notifyPush ?? false,
    specializationId: partial.specializationId ?? "",
  };
}
