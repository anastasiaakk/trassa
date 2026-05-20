import { useEffect } from "react";
import { isPortalSyncEnabled, refreshPortalStateFromServer } from "../utils/portalSync";

const POLL_MS = 45_000;

/** Периодически подтягивает общие данные портала с API. */
export default function PortalSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isPortalSyncEnabled()) return;

    void refreshPortalStateFromServer();

    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void refreshPortalStateFromServer();
    }, POLL_MS);

    const onVisible = () => {
      void refreshPortalStateFromServer();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <>{children}</>;
}
