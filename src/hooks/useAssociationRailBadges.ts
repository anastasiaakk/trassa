import { useCallback, useEffect, useMemo, useState } from "react";
import { countUnreadRadorAlerts } from "../utils/formAlertsStorage";

function formatRailBadge(n: number): string | undefined {
  if (n <= 0) return undefined;
  return n > 99 ? "99+" : String(n);
}

/** Бейдж «Таблицы» для кабинетов РАДОР / АДО. */
export function useAssociationRailBadges() {
  const [formsUnread, setFormsUnread] = useState(() => countUnreadRadorAlerts());

  const sync = useCallback(() => {
    setFormsUnread(countUnreadRadorAlerts());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("trassa-form-alerts-changed", sync);
    window.addEventListener("trassa-portal-state-synced", sync);
    window.addEventListener("focus", sync);
    const id = window.setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("trassa-form-alerts-changed", sync);
      window.removeEventListener("trassa-portal-state-synced", sync);
      window.removeEventListener("focus", sync);
      window.clearInterval(id);
    };
  }, [sync]);

  return useMemo(
    () => ({
      forms: formatRailBadge(formsUnread),
    }),
    [formsUnread]
  );
}
