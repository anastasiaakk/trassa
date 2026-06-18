import { lazy } from "react";
import PortalEntryPage from "../pages/PortalEntryPage";
import { Navigate } from "react-router-dom";
import { ROUTE_ALIAS_ROUTES } from "./routeAliases";
const ServicesMapPage = lazy(() => import("../pages/ServicesMapPage"));
const RoleSelectPage = lazy(() => import("../pages/RoleSelectPage"));
const ContractorCabinetPage = lazy(() => import("../pages/ContractorCabinetPage"));
const AssociationCabinetPage = lazy(() => import("../pages/AssociationCabinetPage"));
const AdoCabinetPage = lazy(() => import("../pages/AdoCabinetPage"));
const ProfileSettings = lazy(() => import("../pages/ProfileSettings"));
const CabinetSchool = lazy(() => import("../pages/CabinetSchool"));
const CabinetSpo = lazy(() => import("../pages/CabinetSpo"));
const DownloadDesktopPage = lazy(() => import("../pages/DownloadDesktopPage"));
const DesignSystemPreview = lazy(() => import("../pages/DesignSystemPreview"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));

/** Маршруты SPA — см. docs/ROUTES.md */
export const APP_ROUTES = [
  ...ROUTE_ALIAS_ROUTES,
  { path: "/", element: <PortalEntryPage /> },
  { path: "/services", element: <ServicesMapPage /> },
  { path: "/page3", element: <RoleSelectPage /> },
  { path: "/cabinet-school/*", element: <CabinetSchool /> },
  { path: "/cabinet-spo/*", element: <CabinetSpo /> },
  { path: "/page4/*", element: <ContractorCabinetPage /> },
  { path: "/page5", element: <AssociationCabinetPage /> },
  { path: "/page5/proforientation", element: <AssociationCabinetPage /> },
  { path: "/page5/documents", element: <AssociationCabinetPage /> },
  { path: "/page5/documents/incoming", element: <AssociationCabinetPage /> },
  { path: "/page5/teams", element: <AssociationCabinetPage /> },
  { path: "/page5/forms", element: <AssociationCabinetPage /> },
  { path: "/page6/forms", element: <AssociationCabinetPage /> },
  { path: "/page6", element: <AdoCabinetPage /> },
  { path: "/page6/proforientation", element: <AdoCabinetPage /> },
  { path: "/page6/documents", element: <AdoCabinetPage /> },
  { path: "/page6/documents/incoming", element: <AdoCabinetPage /> },
  { path: "/page6/teams", element: <AdoCabinetPage /> },
  { path: "/profile", element: <ProfileSettings /> },
  { path: "/download", element: <DownloadDesktopPage /> },
  { path: "/design-preview", element: <DesignSystemPreview /> },
  { path: "/privacy", element: <PrivacyPolicyPage /> },
  { path: "/page1", element: <Navigate to="/" replace /> },
] as const;
