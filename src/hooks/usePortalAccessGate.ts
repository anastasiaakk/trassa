import { useEffect, useState } from "react";
import {
  DEVICE_BAN_MESSAGE,
  readCachedDeviceBan,
  resolvePortalDeviceAccess,
} from "../api/deviceAccessApi";
import { PORTAL_REGION_MESSAGE, resolvePortalRegionAccess } from "../api/regionApi";
import { startDeviceAccessWatch } from "../utils/deviceAccessWatch";
import { isAuthApiEnabled } from "../utils/authMode";

export type PortalAccessState = "allowed" | "banned" | "region-blocked";

/** Проверка региона и бана устройства (фоновая, без блокирующего экрана загрузки). */
export function usePortalAccessGate(privacyAccepted: boolean): {
  portalAccess: PortalAccessState;
  banMessage: string;
  portalBlocked: boolean;
} {
  const apiOn = isAuthApiEnabled();
  const [portalAccess, setPortalAccess] = useState<PortalAccessState>(() => {
    if (!apiOn) return "allowed";
    return readCachedDeviceBan() ? "banned" : "allowed";
  });
  const [banMessage, setBanMessage] = useState(DEVICE_BAN_MESSAGE);

  useEffect(() => {
    if (!apiOn || !privacyAccepted) return;

    let cancelled = false;
    let stopWatch: (() => void) | undefined;

    const applyStatus = (banned: boolean, message = DEVICE_BAN_MESSAGE) => {
      if (cancelled) return;
      if (banned) {
        setBanMessage(message);
        setPortalAccess("banned");
      } else {
        setPortalAccess("allowed");
      }
    };

    void (async () => {
      const region = await resolvePortalRegionAccess();
      if (cancelled) return;
      if (!region.allowed) {
        const detail =
          region.countryName && region.countryCode
            ? `${PORTAL_REGION_MESSAGE} (определена страна: ${region.countryName}).`
            : PORTAL_REGION_MESSAGE;
        setBanMessage(region.message || detail);
        setPortalAccess("region-blocked");
        return;
      }
      const r = await resolvePortalDeviceAccess();
      if (cancelled) return;
      applyStatus(r.banned, r.message);
      stopWatch = startDeviceAccessWatch((banned, message) => applyStatus(banned, message));
    })();

    return () => {
      cancelled = true;
      stopWatch?.();
    };
  }, [apiOn, privacyAccepted]);

  const portalBlocked =
    portalAccess === "banned" || portalAccess === "region-blocked";

  return { portalAccess, banMessage, portalBlocked };
}
