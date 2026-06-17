import { useEffect, useState } from "react";

/** Тот же breakpoint, что в dock.css и cabinet-v2-soft-sidebar.css */
export const CABINET_MOBILE_NAV_MQ = "(max-width: 960px)";

export function useCabinetMobileNav(): boolean {
  const [isMobileNav, setIsMobileNav] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(CABINET_MOBILE_NAV_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(CABINET_MOBILE_NAV_MQ);
    const sync = () => setIsMobileNav(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobileNav;
}
