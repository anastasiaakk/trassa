import { useEffect, useRef } from "react";
import {
  isPortalSyncEnabled,
  PORTAL_SYNC_POLL_HIDDEN_MS,
  PORTAL_SYNC_POLL_VISIBLE_MS,
  refreshPortalStateFromServer,
} from "../utils/portalSync";

/** Периодически подтягивает общие данные портала с API (быстрый опрос версии). */
export default function PortalSyncProvider({ children }: { children: React.ReactNode }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isPortalSyncEnabled()) return;

    const tick = () => {
      void refreshPortalStateFromServer();
    };

    const schedule = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const ms =
        document.visibilityState === "hidden"
          ? PORTAL_SYNC_POLL_HIDDEN_MS
          : PORTAL_SYNC_POLL_VISIBLE_MS;
      intervalRef.current = window.setInterval(tick, ms);
    };

    tick();
    schedule();

    const onVisible = () => {
      tick();
      schedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <>{children}</>;
}
