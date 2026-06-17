import "./utils/portalCaptureShieldEarly";
import "./bootstrapPublicCssVars";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/onest/600.css";
import "@fontsource/onest/700.css";
import "@fontsource/onest/800.css";
import { createRoot } from "react-dom/client";
import App from "./App";
import PortalSyncProvider from "./components/PortalSyncProvider";
import reportWebVitals from "./reportWebVitals";
import { HashRouter } from "react-router-dom";
import { ensureIntroRoute, INTRO_DONE_SESSION_KEY } from "./ensureIntroRoute";
import { warmEntrySplashVideo } from "./utils/entrySplashVideo";
import { scheduleIdlePrefetchCommonRoutes } from "./utils/routePrefetch";
import { whenIntroSplashDone } from "./utils/introSplashRuntime";
import "./typography.css";
import "./global.css";
import "./design-system/portal-v2/portal-motion-pause.css";
import "./design-system/portal-v2/page2-background-lines.css";
import "./design-system/portal-v2/index.css";
import { initPortalDesign } from "./design-system/portalDesign";
import { initPortalDesignTokens } from "./design-system/portalDesignTokens";
import { initPage2BackgroundMode } from "./design-system/page2BackgroundMode";
import { wireClientDiagnostics } from "./utils/clientDiagnostics";
import { suppressPortalWhatsNewGlobally } from "./utils/portalWhatsNew";
import { readCachedDeviceBan } from "./api/deviceAccessApi";
import { isAuthApiEnabled } from "./utils/authMode";
import { hasPortalPrivacyConsent } from "./utils/portalPrivacyConsent";
import { initTrassaDeviceId } from "./utils/deviceId";

initPortalDesign();
initPortalDesignTokens();
suppressPortalWhatsNewGlobally();
if (hasPortalPrivacyConsent()) {
  initTrassaDeviceId();
}
initPage2BackgroundMode();
wireClientDiagnostics();
ensureIntroRoute();
const skipIntroForDeviceBan = isAuthApiEnabled() && readCachedDeviceBan();
try {
  if (!skipIntroForDeviceBan && sessionStorage.getItem(INTRO_DONE_SESSION_KEY) !== "1") {
    void warmEntrySplashVideo();
  }
} catch {
  /* ignore */
}
if (!skipIntroForDeviceBan && sessionStorage.getItem(INTRO_DONE_SESSION_KEY) !== "1") {
  whenIntroSplashDone(scheduleIdlePrefetchCommonRoutes);
} else if (!skipIntroForDeviceBan) {
  scheduleIdlePrefetchCommonRoutes();
}

const container = document.getElementById("root");

const root = createRoot(container as Element);
// HashRouter: маршрут берётся из hash (#/), а не из пути /services в адресной строке.
// Иначе при открытии …/services без hash сразу открывается Страница 2, минуя Страницу 1.
root.render(
  <HashRouter>
    <PortalSyncProvider>
      <App />
    </PortalSyncProvider>
  </HashRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
