import { useEffect, useState } from "react";
import { PORTAL_STATE_SYNCED_EVENT } from "../config/portalKeys";
import {
  getPortalDesign,
  PORTAL_DESIGN_CHANGED,
  type PortalDesignId,
} from "./portalDesign";

export function usePortalDesign(): PortalDesignId {
  const [design, setDesign] = useState<PortalDesignId>(() => getPortalDesign());

  useEffect(() => {
    const sync = () => setDesign(getPortalDesign());
    window.addEventListener(PORTAL_DESIGN_CHANGED, sync);
    window.addEventListener(PORTAL_STATE_SYNCED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PORTAL_DESIGN_CHANGED, sync);
      window.removeEventListener(PORTAL_STATE_SYNCED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return design;
}
