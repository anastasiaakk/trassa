import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchContractorFormAlerts } from "../api/formsApi";
import {
  countUnreadContractorRecommendations,
  DISTRIBUTION_PROPOSALS_CHANGED,
  loadContractorRecommendations,
  type ContractorRecommendation,
} from "../utils/distributionRecommendations";
import { countUnreadContractorAlerts } from "../utils/formAlertsStorage";
import { isAuthApiEnabled } from "../utils/authMode";

function formatRailBadge(n: number): string | undefined {
  if (n <= 0) return undefined;
  return n > 99 ? "99+" : String(n);
}

/** Счётчики для бокового меню подрядчика (таблицы, студенты). */
export function useContractorRailBadges(contractorEmail: string) {
  const [recommendations, setRecommendations] = useState<ContractorRecommendation[]>([]);
  const [formsUnread, setFormsUnread] = useState(0);

  const emailNorm = contractorEmail.trim().toLowerCase();

  const reloadRecommendations = useCallback(() => {
    if (!emailNorm) {
      setRecommendations([]);
      return;
    }
    void loadContractorRecommendations(emailNorm).then(setRecommendations);
  }, [emailNorm]);

  const syncFormAlertsUnreadLocal = useCallback(() => {
    setFormsUnread(emailNorm ? countUnreadContractorAlerts(emailNorm) : 0);
  }, [emailNorm]);

  const reloadFormAlertsFromApi = useCallback(() => {
    if (!emailNorm) {
      setFormsUnread(0);
      return;
    }
    if (!isAuthApiEnabled()) {
      syncFormAlertsUnreadLocal();
      return;
    }
    void fetchContractorFormAlerts().then((r) => {
      if (r.ok) {
        setFormsUnread(r.alerts.filter((a) => !a.read).length);
      } else {
        syncFormAlertsUnreadLocal();
      }
    });
  }, [emailNorm, syncFormAlertsUnreadLocal]);

  useEffect(() => {
    reloadRecommendations();
    const onChange = () => reloadRecommendations();
    window.addEventListener(DISTRIBUTION_PROPOSALS_CHANGED, onChange);
    window.addEventListener("trassa-profile-saved", onChange);
    window.addEventListener("focus", onChange);
    const id = window.setInterval(reloadRecommendations, 20_000);
    return () => {
      window.removeEventListener(DISTRIBUTION_PROPOSALS_CHANGED, onChange);
      window.removeEventListener("trassa-profile-saved", onChange);
      window.removeEventListener("focus", onChange);
      window.clearInterval(id);
    };
  }, [reloadRecommendations]);

  useEffect(() => {
    reloadFormAlertsFromApi();
    const onLocalChange = () => syncFormAlertsUnreadLocal();
    window.addEventListener("trassa-form-alerts-changed", onLocalChange);
    window.addEventListener("trassa-portal-state-synced", onLocalChange);
    window.addEventListener("focus", reloadFormAlertsFromApi);
    const id = window.setInterval(reloadFormAlertsFromApi, 30_000);
    return () => {
      window.removeEventListener("trassa-form-alerts-changed", onLocalChange);
      window.removeEventListener("trassa-portal-state-synced", onLocalChange);
      window.removeEventListener("focus", reloadFormAlertsFromApi);
      window.clearInterval(id);
    };
  }, [reloadFormAlertsFromApi, syncFormAlertsUnreadLocal]);

  const recommendationsUnread = countUnreadContractorRecommendations(
    contractorEmail,
    recommendations
  );

  return useMemo(
    () => ({
      forms: formatRailBadge(formsUnread),
      recommendations: formatRailBadge(recommendationsUnread),
    }),
    [formsUnread, recommendationsUnread]
  );
}
