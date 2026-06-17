import { useEffect, useRef } from "react";
import {
  isPortalSyncEnabled,
  PORTAL_SYNC_POLL_HIDDEN_MS,
  PORTAL_SYNC_POLL_VISIBLE_MS,
  refreshPortalStateFromServer,
} from "../utils/portalSync";
import { INTRO_DONE_SESSION_KEY } from "../ensureIntroRoute";
import { isIntroSplashActive, whenIntroSplashDone } from "../utils/introSplashRuntime";
import { readCachedDeviceBan } from "../api/deviceAccessApi";

function introSplashPending(): boolean {
  try {
    return sessionStorage.getItem(INTRO_DONE_SESSION_KEY) !== "1";
  } catch {
    return false;
  }
}

/** Периодически подтягивает общие данные портала с API (быстрый опрос версии). */
export default function PortalSyncProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPortalSyncEnabled() || readCachedDeviceBan()) return;

    let cancelled = false;

    const tick = () => {
      if (isIntroSplashActive()) return;
      void refreshPortalStateFromServer();
    };

    const schedule = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (isIntroSplashActive()) return;
      const ms =
        document.visibilityState === "hidden"
          ? PORTAL_SYNC_POLL_HIDDEN_MS
          : PORTAL_SYNC_POLL_VISIBLE_MS;
      intervalRef.current = window.setInterval(tick, ms);
    };

    const start = () => {
      if (cancelled) return;
      tick();
      schedule();
    };

    if (introSplashPending()) {
      whenIntroSplashDone(start);
    } else {
      start();
    }

    const onVisible = () => {
      tick();
      schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <>{children}</>;
}
