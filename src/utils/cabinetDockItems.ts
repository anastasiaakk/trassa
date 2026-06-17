import type { NavigateFunction } from "react-router-dom";
import { navigateToProfileSettings } from "./profileNavigation";
import type { CabinetDockItem } from "../components/CabinetQuickDock";

export type CabinetSection = "dashboard" | "messenger";

export type AssociationCabinetSection = "dashboard" | "events" | "messenger";

type AssociationDockParams = {
  basePath: string;
  pathname: string;
  cabinetSection: AssociationCabinetSection;
  messengerHasUnread: boolean;
  navigate: NavigateFunction;
  setCabinetSection: (section: AssociationCabinetSection) => void;
  onOpenEvents: () => void;
};

export function buildAssociationDockItems({
  basePath,
  pathname,
  cabinetSection,
  messengerHasUnread: _messengerHasUnread,
  navigate,
  setCabinetSection,
  onOpenEvents,
}: AssociationDockParams): CabinetDockItem[] {
  const onDashboardHome =
    pathname === basePath &&
    cabinetSection === "dashboard";

  return [
    {
      id: "home",
      label: "Главная",
      shortLabel: "Главная",
      icon: "home",
      active: onDashboardHome,
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(basePath);
      },
    },
    {
      id: "events",
      label: "Мероприятия",
      shortLabel: "События",
      icon: "events",
      active: cabinetSection === "events",
      onClick: onOpenEvents,
    },
    {
      id: "documents",
      label: "Документы",
      shortLabel: "Документы",
      icon: "documents",
      active: pathname.startsWith(`${basePath}/documents`),
      onClick: () => {
        setCabinetSection("dashboard");
        navigate(`${basePath}/documents`);
      },
    },
    {
      id: "profile",
      label: "Профиль",
      shortLabel: "Профиль",
      icon: "profile",
      active: pathname.startsWith("/profile"),
      onClick: () => navigateToProfileSettings(navigate, pathname),
    },
  ];
}

type BuildParams = {
  cabinetPath: string;
  pathname: string;
  cabinetSection: CabinetSection;
  messengerEnabled: boolean;
  messengerHasUnread: boolean;
  navigate: NavigateFunction;
  setCabinetSection: (section: CabinetSection) => void;
  locationState: unknown;
};

export function buildCabinetDockItems({
  cabinetPath,
  pathname,
  cabinetSection,
  messengerEnabled: _messengerEnabled,
  messengerHasUnread: _messengerHasUnread,
  navigate,
  setCabinetSection,
  locationState,
}: BuildParams): CabinetDockItem[] {
  if (cabinetPath === "/cabinet-school") {
    const schoolTab = (locationState as { schoolTab?: string } | null)?.schoolTab;
    const onHome =
      pathname === "/cabinet-school" &&
      cabinetSection === "dashboard" &&
      schoolTab !== "materials";
    return [
      {
        id: "home",
        label: "Главная",
        shortLabel: "Главная",
        icon: "home",
        active: onHome,
        onClick: () => {
          setCabinetSection("dashboard");
          navigate("/cabinet-school", { state: { schoolTab: "home" } });
        },
      },
      {
        id: "materials",
        label: "Материалы",
        shortLabel: "Материалы",
        icon: "materials",
        active:
          pathname === "/cabinet-school" &&
          cabinetSection === "dashboard" &&
          schoolTab === "materials",
        onClick: () => {
          setCabinetSection("dashboard");
          navigate("/cabinet-school", { state: { schoolTab: "materials" } });
        },
      },
      {
        id: "messages",
        label: "Письма",
        shortLabel: "Письма",
        icon: "messages",
        active: pathname.startsWith("/cabinet-school/messages"),
        onClick: () => navigate("/cabinet-school/messages"),
      },
      {
        id: "profile",
        label: "Профиль",
        shortLabel: "Профиль",
        icon: "profile",
        active: pathname.startsWith("/profile"),
        onClick: () => navigateToProfileSettings(navigate, pathname),
      },
    ];
  }

  if (cabinetPath === "/cabinet-spo") {
    return [
      {
        id: "home",
        label: "Главная",
        shortLabel: "Главная",
        icon: "home",
        active: pathname === "/cabinet-spo" && cabinetSection === "dashboard",
        onClick: () => {
          setCabinetSection("dashboard");
          navigate("/cabinet-spo");
        },
      },
      {
        id: "requests",
        label: "Заявки",
        shortLabel: "Заявки",
        icon: "requests",
        active: pathname.startsWith("/cabinet-spo/requests"),
        onClick: () => navigate("/cabinet-spo/requests"),
      },
      {
        id: "portfolio",
        label: "Портфолио",
        shortLabel: "Портфолио",
        icon: "portfolio",
        active: pathname.startsWith("/cabinet-spo/portfolio"),
        onClick: () => navigate("/cabinet-spo/portfolio"),
      },
      {
        id: "profile",
        label: "Профиль",
        shortLabel: "Профиль",
        icon: "profile",
        active: pathname.startsWith("/profile"),
        onClick: () => navigateToProfileSettings(navigate, pathname),
      },
    ];
  }

  if (cabinetPath === "/page4") {
    return [
      {
        id: "home",
        label: "Главная",
        shortLabel: "Главная",
        icon: "home",
        active: pathname === "/page4" && cabinetSection === "dashboard",
        onClick: () => {
          setCabinetSection("dashboard");
          navigate("/page4");
        },
      },
      {
        id: "forms",
        label: "Формы",
        shortLabel: "Формы",
        icon: "forms",
        active: pathname.startsWith("/page4/forms"),
        onClick: () => navigate("/page4/forms"),
      },
      {
        id: "documents",
        label: "Документы",
        shortLabel: "Документы",
        icon: "documents",
        active: pathname.startsWith("/page4/documents"),
        onClick: () => navigate("/page4/documents"),
      },
      {
        id: "profile",
        label: "Профиль",
        shortLabel: "Профиль",
        icon: "profile",
        active: pathname.startsWith("/profile"),
        onClick: () => navigateToProfileSettings(navigate, pathname),
      },
    ];
  }

  return [];
}
