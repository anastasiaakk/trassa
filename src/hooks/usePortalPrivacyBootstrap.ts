import { useEffect, useState } from "react";
import { isAuthApiEnabled } from "../utils/authMode";
import {
  ensurePortalConsentServerSync,
  hasPortalPrivacyConsent,
  PORTAL_PRIVACY_CONSENT_EVENT,
  wirePortalEntryConsent,
} from "../utils/portalPrivacyConsent";

/** Локальное согласие ПДн + регистрация устройства на сервере. */
export function usePortalPrivacyBootstrap(): boolean {
  const [privacyAccepted, setPrivacyAccepted] = useState(() => hasPortalPrivacyConsent());
  const apiOn = isAuthApiEnabled();

  useEffect(() => {
    const sync = () => setPrivacyAccepted(hasPortalPrivacyConsent());
    window.addEventListener(PORTAL_PRIVACY_CONSENT_EVENT, sync);
    return () => window.removeEventListener(PORTAL_PRIVACY_CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!apiOn) return;
    return wirePortalEntryConsent();
  }, [apiOn]);

  useEffect(() => {
    if (!apiOn) return;
    ensurePortalConsentServerSync();
    const id = window.setInterval(() => ensurePortalConsentServerSync(), 45_000);
    return () => window.clearInterval(id);
  }, [apiOn]);

  return privacyAccepted;
}
