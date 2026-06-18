import { resolveOrganizationFromInput } from "./contractorOrganizations";

export function contractorOrgValidationMessage(
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
