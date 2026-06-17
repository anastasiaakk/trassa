import { lazy } from "react";
import Page1Flow from "../pages/Page1Flow";
import { Navigate } from "react-router-dom";
import { ROUTE_ALIAS_ROUTES } from "./routeAliases";
const Page2 = lazy(() => import("../pages/Page2"));
const Page3 = lazy(() => import("../pages/Page3"));
const Page4 = lazy(() => import("../pages/Page4"));
const Page5 = lazy(() => import("../pages/Page5"));
const Page6 = lazy(() => import("../pages/Page6"));
const ProfileSettings = lazy(() => import("../pages/ProfileSettings"));
const CabinetSchool = lazy(() => import("../pages/CabinetSchool"));
const CabinetSpo = lazy(() => import("../pages/CabinetSpo"));
const DownloadDesktopPage = lazy(() => import("../pages/DownloadDesktopPage"));
const DesignSystemPreview = lazy(() => import("../pages/DesignSystemPreview"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));

/** Маршруты SPA — см. docs/ROUTES.md */
export const APP_ROUTES = [
  ...ROUTE_ALIAS_ROUTES,
  { path: "/", element: <Page1Flow /> },
  { path: "/services", element: <Page2 /> },
  { path: "/page3", element: <Page3 /> },
  { path: "/cabinet-school/*", element: <CabinetSchool /> },
  { path: "/cabinet-spo/*", element: <CabinetSpo /> },
  { path: "/page4/*", element: <Page4 /> },
  { path: "/page5", element: <Page5 /> },
  { path: "/page5/proforientation", element: <Page5 /> },
  { path: "/page5/documents", element: <Page5 /> },
  { path: "/page5/documents/incoming", element: <Page5 /> },
  { path: "/page5/teams", element: <Page5 /> },
  { path: "/page5/forms", element: <Page5 /> },
  { path: "/page6/forms", element: <Page5 /> },
  { path: "/page6", element: <Page6 /> },
  { path: "/page6/proforientation", element: <Page6 /> },
  { path: "/page6/documents", element: <Page6 /> },
  { path: "/page6/documents/incoming", element: <Page6 /> },
  { path: "/page6/teams", element: <Page6 /> },
  { path: "/profile", element: <ProfileSettings /> },
  { path: "/download", element: <DownloadDesktopPage /> },
  { path: "/design-preview", element: <DesignSystemPreview /> },
  { path: "/privacy", element: <PrivacyPolicyPage /> },
  { path: "/page1", element: <Navigate to="/" replace /> },
] as const;
