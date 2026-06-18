import type { NavigateFunction } from "react-router-dom";
import type { CabinetRailIconId } from "../components/cabinet/CabinetRailIcons";
import { navigateToProfileSettings } from "./profileNavigation";

export type CabinetRailItem = {
  id: string;
  label: string;
  icon: CabinetRailIconId;
  active: boolean;
  onClick: () => void;
  badge?: string;
};

export type CabinetRailGroup = {
  id: string;
  label: string;
  items: CabinetRailItem[];
};

export type CabinetRailBadgeOverrides = Partial<Record<string, string | undefined>>;

type RailParams = {
  cabinetPath: string;
  pathname: string;
  cabinetSection: "dashboard" | "messenger" | "events";
  messengerEnabled: boolean;
  navigate: NavigateFunction;
  setCabinetSection: (s: "dashboard" | "messenger") => void;
  badgeOverrides?: CabinetRailBadgeOverrides;
};

export function buildCabinetRailItems({
  cabinetPath,
  pathname,
  cabinetSection,
  navigate,
  setCabinetSection,
}: RailParams): CabinetRailItem[] {
  const items: CabinetRailItem[] = [
    {
      id: "home",
      label: "Главная",
      icon: "home",
      active: cabinetSection === "dashboard" && pathname === cabinetPath,
      onClick: () => {
        setCabinetSection("dashboard");
        if (cabinetPath === "/cabinet-school") navigate("/cabinet-school");
        else if (cabinetPath === "/cabinet-spo") navigate("/cabinet-spo");
        else navigate(cabinetPath);
      },
    },
  ];

  if (cabinetPath === "/cabinet-school") {
    items.push(
      {
        id: "materials",
        label: "Материалы",
        icon: "materials",
        active: pathname.startsWith("/cabinet-school/materials"),
        onClick: () => navigate("/cabinet-school/materials"),
      },
      {
        id: "messages",
        label: "Письма",
        icon: "messages",
        active: pathname.startsWith("/cabinet-school/messages"),
        onClick: () => navigate("/cabinet-school/messages"),
      },
      {
        id: "calendar",
        label: "Календарь",
        icon: "calendar",
        active: pathname.startsWith("/cabinet-school/calendar"),
        onClick: () => navigate("/cabinet-school/calendar"),
      }
    );
  }

  if (cabinetPath === "/cabinet-spo") {
    items.push(
      {
        id: "requests",
        label: "Заявки",
        icon: "requests",
        active: pathname.startsWith("/cabinet-spo/requests"),
        onClick: () => navigate("/cabinet-spo/requests"),
      },
      {
        id: "portfolio",
        label: "Портфолио",
        icon: "portfolio",
        active: pathname.startsWith("/cabinet-spo/portfolio"),
        onClick: () => navigate("/cabinet-spo/portfolio"),
      }
    );
  }

  if (cabinetPath === "/page4") {
    items.push(
      {
        id: "recommendations",
        label: "Студенты",
        icon: "students",
        active: pathname.startsWith("/page4/recommendations"),
        onClick: () => navigate("/page4/recommendations"),
      },
      {
        id: "forms",
        label: "Таблицы",
        icon: "forms",
        active: pathname.startsWith("/page4/forms"),
        onClick: () => navigate("/page4/forms"),
      },
      {
        id: "teams",
        label: "Команды",
        icon: "teams",
        active: pathname.startsWith("/page4/teams"),
        onClick: () => navigate("/page4/teams"),
      },
      {
        id: "documents",
        label: "Документы",
        icon: "documents",
        active: pathname.startsWith("/page4/documents"),
        onClick: () => navigate("/page4/documents"),
      },
      {
        id: "proforientation",
        label: "Профориентация",
        icon: "proforientation",
        active: pathname.startsWith("/page4/proforientation"),
        onClick: () => navigate("/page4/proforientation"),
      }
    );
  }

  items.push({
    id: "profile",
    label: "Профиль",
    icon: "profile",
    active: pathname.startsWith("/profile"),
    onClick: () => navigateToProfileSettings(navigate, pathname),
  });

  return items;
}

const RAIL_GROUP_LABELS: Record<string, string> = {
  main: "Главное",
  work: "Разделы",
  account: "Аккаунт",
};

function applyBadgeOverrides(
  items: CabinetRailItem[],
  overrides?: CabinetRailBadgeOverrides
): CabinetRailItem[] {
  if (!overrides) return items;
  return items.map((item) => {
    const badge = overrides[item.id];
    return badge ? { ...item, badge } : item;
  });
}

/** Группы для бокового меню кабинета (как в админке). */
export function buildCabinetRailGroups(params: RailParams): CabinetRailGroup[] {
  const items = applyBadgeOverrides(buildCabinetRailItems(params), params.badgeOverrides);
  const main = items.filter((i) => i.id === "home");
  const account = items.filter((i) => i.id === "profile");
  const work = items.filter((i) => i.id !== "home" && i.id !== "profile");

  const groups: CabinetRailGroup[] = [];
  if (main.length) groups.push({ id: "main", label: RAIL_GROUP_LABELS.main, items: main });
  if (work.length) groups.push({ id: "work", label: RAIL_GROUP_LABELS.work, items: work });
  if (account.length) groups.push({ id: "account", label: RAIL_GROUP_LABELS.account, items: account });
  return groups;
}

export function getCabinetSectionMeta(
  pathname: string,
  cabinetPath: string,
  cabinetSection: "dashboard" | "messenger" | "events",
): string {
  if (cabinetSection === "messenger") return "Мессенджер";
  if (cabinetSection === "events") return "Мероприятия";
  if (pathname.startsWith("/cabinet-school/messages")) return "Письма и объявления";
  if (pathname.startsWith("/cabinet-school/calendar")) return "Календарь";
  if (pathname.startsWith("/cabinet-spo/requests")) return "Заявки";
  if (pathname.startsWith("/cabinet-spo/portfolio")) return "Портфолио";
  if (pathname.startsWith("/page4/forms")) return "Формы";
  if (pathname.startsWith("/page4/documents")) return "Документы";
  if (pathname.startsWith("/page4/teams")) return "Команды";
  if (pathname.startsWith("/page4/recommendations")) return "Рекомендации";
  if (pathname.startsWith("/page4/proforientation")) return "Профориентация";
  if (pathname.startsWith("/page4/planner")) return "Планнер";
  if (pathname === cabinetPath) return "Главная";
  return "Раздел";
}

export function getCabinetTitle(cabinetPath: string): string {
  switch (cabinetPath) {
    case "/cabinet-school":
      return "Кабинет школьника";
    case "/cabinet-spo":
      return "Кабинет студента";
    case "/page4":
      return "Кабинет подрядчика";
    case "/page5":
      return "Кабинет РАДОР";
    case "/page6":
      return "Кабинет АДО";
    default:
      return "Кабинет";
  }
}
