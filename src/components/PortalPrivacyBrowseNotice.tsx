import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { PORTAL_PRIVACY_BROWSE_NOTICE } from "../legal/portalLegalConfig";
import {
  hasPortalPrivacyConsent,
  PORTAL_PRIVACY_CONSENT_EVENT,
} from "../utils/portalPrivacyConsent";

/** Подпись о политике — только первый запуск на устройстве (до согласия). */
export default function PortalPrivacyBrowseNotice() {
  const [visible, setVisible] = useState(() => !hasPortalPrivacyConsent());

  useEffect(() => {
    const sync = () => setVisible(!hasPortalPrivacyConsent());
    window.addEventListener(PORTAL_PRIVACY_CONSENT_EVENT, sync);
    return () => window.removeEventListener(PORTAL_PRIVACY_CONSENT_EVENT, sync);
  }, []);

  if (typeof document === "undefined" || !visible) return null;

  return createPortal(
    <p className="portal-privacy-browse-notice" role="note">
      {PORTAL_PRIVACY_BROWSE_NOTICE.prefix}{" "}
      <Link to="/privacy">{PORTAL_PRIVACY_BROWSE_NOTICE.linkLabel}</Link>
      {PORTAL_PRIVACY_BROWSE_NOTICE.suffix}
    </p>,
    document.body
  );
}
