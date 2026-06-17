import { useEffect, useState } from "react";
import { PORTAL_STATE_SYNCED_EVENT } from "../config/portalKeys";
import {
  loadViolationsGuardState,
  VIOLATIONS_GUARD_CHANGED,
} from "../utils/violationsGuardMode";

export function useViolationsGuardState() {
  const [violationsGuard, setViolationsGuard] = useState(() => loadViolationsGuardState());

  useEffect(() => {
    const syncGuard = () => setViolationsGuard(loadViolationsGuardState());
    window.addEventListener(VIOLATIONS_GUARD_CHANGED, syncGuard);
    window.addEventListener(PORTAL_STATE_SYNCED_EVENT, syncGuard);
    return () => {
      window.removeEventListener(VIOLATIONS_GUARD_CHANGED, syncGuard);
      window.removeEventListener(PORTAL_STATE_SYNCED_EVENT, syncGuard);
    };
  }, []);

  return violationsGuard;
}
