import type { AdminSectionId } from "../utils/adminRouteState";

export type AdminNavItem = { id: AdminSectionId; label: string };

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

/** Структура навигации админки (дублирует AdminDashboard — для документации и будущего рефакторинга). */
export function buildAdminNavFlat(apiEnabled: boolean, portalSync: boolean): AdminNavItem[] {
  const items: AdminNavItem[] = [
    { id: "home", label: "Главная" },
    { id: "settings", label: "Настройки" },
    { id: "designSystem", label: "Дизайн-система" },
    { id: "users", label: "Пользователи" },
    { id: "specs", label: "Спецификации" },
    { id: "tables", label: "Таблицы" },
    { id: "map", label: "Карта" },
    { id: "orgs", label: "Подрядчики" },
  ];
  if (apiEnabled && portalSync) {
    items.push({ id: "release", label: "Обновления" });
    items.push({ id: "devices", label: "Выход с устройств" });
    items.push({ id: "violations", label: "Нарушения" });
  }
  items.push({ id: "account", label: "Аккаунт" });
  return items;
}

export function buildAdminNavGrouped(apiEnabled: boolean, portalSync: boolean): AdminNavGroup[] {
  const data: AdminNavItem[] = [
    { id: "users", label: "Пользователи" },
    { id: "specs", label: "Спецификации" },
    { id: "tables", label: "Таблицы" },
    { id: "map", label: "Карта" },
    { id: "orgs", label: "Подрядчики" },
  ];
  const system: AdminNavItem[] = [
    { id: "settings", label: "Настройки" },
    { id: "designSystem", label: "Дизайн-система" },
  ];
  if (apiEnabled && portalSync) {
    system.push({ id: "release", label: "Обновления" });
    system.push({ id: "devices", label: "Выход с устройств" });
    system.push({ id: "violations", label: "Нарушения" });
  }
  system.push({ id: "account", label: "Аккаунт" });
  return [
    { id: "main", label: "Основное", items: [{ id: "home", label: "Главная" }] },
    { id: "data", label: "Данные", items: data },
    { id: "system", label: "Система", items: system },
  ];
}
