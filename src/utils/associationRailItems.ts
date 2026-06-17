import type { NavigateFunction } from "react-router-dom";
import { navigateToProfileSettings } from "./profileNavigation";
import type {
  CabinetRailBadgeOverrides,
  CabinetRailGroup,
  CabinetRailItem,
} from "./cabinetRailItems";

export type AssociationCabinetSection = "dashboard" | "events" | "messenger";

type AssociationRailParams = {
  basePath: string;
  pathname: string;
  cabinetSection: AssociationCabinetSection;
  navigate: NavigateFunction;
  setCabinetSection: (s: AssociationCabinetSection) => void;
  onOpenEvents: () => void;
  badgeOverrides?: CabinetRailBadgeOverrides;
};

export function buildAssociationRailItems({
  basePath,
  pathname,
  cabinetSection,
  navigate,
  setCabinetSection,
  onOpenEvents,
}: AssociationRailParams): CabinetRailItem[] {
  return [
    {
      id: "home",
      label: "Главная",
      icon: "home",
      active: pathname === basePath && cabinetSection === "dashboard",
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(basePath);
      },
    },
    {
      id: "events",
      label: "Мероприятия",
      icon: "events",
      active: cabinetSection === "events",
      onClick: onOpenEvents,
    },
    {
      id: "documents",
      label: "Документы",
      icon: "documents",
      active:
        pathname.startsWith(`${basePath}/documents`) &&
        !pathname.startsWith(`${basePath}/documents/incoming`),
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(`${basePath}/documents`);
      },
    },
    {
      id: "incoming",
      label: "Входящие",
      icon: "incoming",
      active: pathname.startsWith(`${basePath}/documents/incoming`),
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(`${basePath}/documents/incoming`);
      },
    },
    {
      id: "teams",
      label: "Команды",
      icon: "teams",
      active: pathname.startsWith(`${basePath}/teams`),
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(`${basePath}/teams`);
      },
    },
    {
      id: "forms",
      label: "Таблицы",
      icon: "forms",
      active: pathname.startsWith(`${basePath}/forms`),
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(`${basePath}/forms`);
      },
    },
    {
      id: "proforientation",
      label: "Профориентация",
      icon: "proforientation",
      active: pathname.startsWith(`${basePath}/proforientation`),
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(`${basePath}/proforientation`);
      },
    },
    {
      id: "profile",
      label: "Профиль",
      icon: "profile",
      active: pathname.startsWith("/profile"),
      onClick: () => navigateToProfileSettings(navigate, pathname),
    },
  ];
}

function applyAssociationBadgeOverrides(
  items: CabinetRailItem[],
  overrides?: CabinetRailBadgeOverrides
): CabinetRailItem[] {
  return items.map((item) => {
    const badge = overrides?.[item.id];
    return badge ? { ...item, badge } : item;
  });
}

/** Группы бокового меню ассоциации (РАДОР / АДО). */
export function buildAssociationRailGroups(params: AssociationRailParams): CabinetRailGroup[] {
  const items = applyAssociationBadgeOverrides(
    buildAssociationRailItems(params),
    params.badgeOverrides
  );
  const main = items.filter((i) => i.id === "home" || i.id === "events");
  const work = items.filter((i) =>
    ["documents", "incoming", "teams", "forms", "proforientation"].includes(i.id)
  );
  const account = items.filter((i) => i.id === "profile");
  const groups: CabinetRailGroup[] = [];
  if (main.length) groups.push({ id: "main", label: "Главное", items: main });
  if (work.length) groups.push({ id: "work", label: "Разделы", items: work });
  if (account.length) groups.push({ id: "account", label: "Аккаунт", items: account });
  return groups;
}

export function getAssociationSectionMeta(
  pathname: string,
  basePath: string,
  cabinetSection: AssociationCabinetSection
): string {
  if (cabinetSection === "messenger") return "Мессенджер";
  if (cabinetSection === "events") return "Мероприятия";
  if (pathname.startsWith(`${basePath}/documents/incoming`)) return "Входящие документы";
  if (pathname.startsWith(`${basePath}/documents`)) return "Документы";
  if (pathname.startsWith(`${basePath}/teams`)) return "Студенческие команды";
  if (pathname.startsWith(`${basePath}/forms`)) return "Таблицы подрядчиков";
  if (pathname.startsWith(`${basePath}/proforientation`)) return "Профориентация";
  if (pathname === basePath && cabinetSection === "dashboard") return "Главная";
  return "Раздел";
}
