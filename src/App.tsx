import { Suspense, memo, useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  useNavigationType,
  useLocation,
} from "react-router-dom";
import "./App.css";
import { authMe } from "./api/authApi";
import { saveProfileSettings } from "./profileSettingsStorage";
import Page2Background from "./components/Page2Background";
import { isAuthApiEnabled } from "./utils/authMode";
import { loadMaintenanceState } from "./utils/maintenanceMode";
import { getPortalDesign } from "./design-system/portalDesign";
import { INTRO_DONE_SESSION_KEY } from "./ensureIntroRoute";
import { whenIntroSplashDone } from "./utils/introSplashRuntime";
import DeviceAccessBlocked from "./components/DeviceAccessBlocked";
import PortalPrivacyBrowseNotice from "./components/PortalPrivacyBrowseNotice";
import { hideCaptureShield, startPortalScreenshotGuard } from "./utils/portalScreenshotGuard";
import { isScreenshotShieldDisabledClient } from "./utils/portalMobileCaptureGuard";
import { isProfileCabinetTransition } from "./utils/profileNavigation";
import { APP_ROUTES } from "./routes/appRoutes";
import { usePortalPrivacyBootstrap } from "./hooks/usePortalPrivacyBootstrap";
import { usePortalAccessGate } from "./hooks/usePortalAccessGate";
import { useRouteBodyClasses } from "./hooks/useRouteBodyClasses";
import { useViolationsGuardState } from "./hooks/useViolationsGuardState";
import { usePageMeta } from "./hooks/usePageMeta";

function MaintenanceOverlay() {
  const location = useLocation();
  const [state, setState] = useState(loadMaintenanceState);

  useEffect(() => {
    const onChange = () => setState(loadMaintenanceState());
    window.addEventListener("trassa-maintenance-changed", onChange);
    return () => window.removeEventListener("trassa-maintenance-changed", onChange);
  }, []);

  if (!state.active) {
    return null;
  }
  if (location.pathname === "/services") {
    return null;
  }

  const isV2 = getPortalDesign() === "v2";

  return (
    <div
      className={isV2 ? "maintenance-v2" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: isV2
          ? undefined
          : "linear-gradient(160deg, #1a2744 0%, #0d1526 100%)",
        color: isV2 ? undefined : "#e8eef8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div className={isV2 ? "maintenance-v2__card" : undefined} style={isV2 ? undefined : { maxWidth: 520 }}>
        <h1
          className={isV2 ? "maintenance-v2__title" : undefined}
          style={
            isV2
              ? undefined
              : { margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 700 }
          }
        >
          Технические работы
        </h1>
        <p style={{ margin: 0, lineHeight: 1.55, fontSize: "1rem", opacity: 0.95 }}>
          {state.message}
        </p>
        <p
          className={isV2 ? "maintenance-v2__hint" : undefined}
          style={
            isV2
              ? undefined
              : {
                  marginTop: 24,
                  fontSize: "0.88rem",
                  opacity: 0.75,
                  lineHeight: 1.45,
                }
          }
        >
          Администратор может открыть раздел «Карта подрядчиков» в меню портала
          (маршрут /services), войти в панель и отключить режим техработ.
        </p>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    const stripShield = () => {
      document.documentElement.classList.remove("portal-capture-shield-active");
      document.getElementById("portal-capture-shield")?.remove();
    };
    stripShield();
    window.addEventListener("pageshow", stripShield);
    return () => window.removeEventListener("pageshow", stripShield);
  }, []);

  const apiOn = isAuthApiEnabled();
  const privacyAccepted = usePortalPrivacyBootstrap();
  const violationsGuard = useViolationsGuardState();
  const { portalAccess, banMessage, portalBlocked } = usePortalAccessGate(privacyAccepted);

  const [portalUserName, setPortalUserName] = useState<string | null>(null);
  const portalUserNameRef = useRef<string | null>(null);
  portalUserNameRef.current = portalUserName;

  const action = useNavigationType();
  const location = useLocation();
  const pathname = location.pathname;
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (action === "POP") return;
    if (isProfileCabinetTransition(prev, pathname)) return;
    window.scrollTo(0, 0);
  }, [action, pathname]);

  useRouteBodyClasses();

  const isV2 = getPortalDesign() === "v2";
  const isPage1Home = pathname === "/";
  const isPage2Map = pathname === "/services" || pathname === "/map";

  usePageMeta();

  useEffect(() => {
    if (portalAccess === "allowed") return;
    document.documentElement.classList.remove("portal-capture-shield-active");
    document.getElementById("portal-capture-shield")?.remove();
    hideCaptureShield();
  }, [portalAccess]);

  /** Защита от скриншотов — только ПК без тача (на телефоне отключена). */
  useEffect(() => {
    if (isScreenshotShieldDisabledClient()) {
      document.documentElement.classList.remove("portal-capture-shield-active");
      document.getElementById("portal-capture-shield")?.remove();
      hideCaptureShield();
      return;
    }
    if (!apiOn || portalBlocked || !privacyAccepted || !violationsGuard.enabled) {
      document.documentElement.classList.remove("portal-capture-shield-active");
      hideCaptureShield();
      return;
    }
    let stop: (() => void) | undefined;
    whenIntroSplashDone(() => {
      try {
        if (sessionStorage.getItem(INTRO_DONE_SESSION_KEY) !== "1") return;
      } catch {
        return;
      }
      stop = startPortalScreenshotGuard({
        userName: () => portalUserNameRef.current,
      });
    });
    return () => {
      stop?.();
      document.documentElement.classList.remove("portal-capture-shield-active");
    };
  }, [apiOn, portalBlocked, privacyAccepted, violationsGuard.enabled]);

  /** Подтягиваем профиль с сервера, если есть сессия (JWT cookie). */
  useEffect(() => {
    if (!apiOn || portalBlocked || !privacyAccepted) return;
    const load = () => {
      void authMe().then((r) => {
        if (r.ok) {
          saveProfileSettings(r.profile);
          const name = [r.profile.lastName, r.profile.firstName]
            .filter(Boolean)
            .join(" ")
            .trim();
          setPortalUserName(name || r.profile.email || null);
        }
      });
    };
    try {
      if (sessionStorage.getItem(INTRO_DONE_SESSION_KEY) !== "1") {
        whenIntroSplashDone(load);
        return;
      }
    } catch {
      /* ignore */
    }
    load();
  }, [apiOn, portalBlocked, privacyAccepted]);

  if (portalAccess === "region-blocked") {
    return (
      <DeviceAccessBlocked
        title="Портал недоступен"
        message={banMessage}
        hint={null}
      />
    );
  }

  if (portalAccess === "banned") {
    return (
      <DeviceAccessBlocked
        message={banMessage}
        title="Сервис недоступен"
        hint={null}
      />
    );
  }

  return (
    <>
      <div
        className={`app-shell${isPage1Home ? " app-shell--page1" : ""}${isPage2Map ? " app-shell--page2" : ""}${!privacyAccepted ? " app-shell--privacy-notice" : ""}`}
      >
        <div className="app-shell__bg" aria-hidden>
          <div className="app-shell__bgFill" />
          {isPage1Home ? (
            <div className="page1-ambient" aria-hidden>
              <div className="page1-ambient__aurora page1-ambient__aurora--a" />
              <div className="page1-ambient__aurora page1-ambient__aurora--b" />
              <div className="page1-ambient__depth" />
              <div className="page1-ambient__sweep" />
            </div>
          ) : null}
          {isPage2Map ? <Page2Background /> : null}
        </div>
        <div className="app-shell__main">
          <Suspense
            fallback={
              <div
                style={{
                  minHeight: "40vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-ui)",
                  color: isV2 ? "var(--pv2-muted)" : "#5c6b8a",
                }}
              >
                Загрузка…
              </div>
            }
          >
            <Routes>
              {APP_ROUTES.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </Suspense>
        </div>
      </div>
      {!privacyAccepted ? <PortalPrivacyBrowseNotice /> : null}
      <MaintenanceOverlay />
    </>
  );
}

export default memo(App);