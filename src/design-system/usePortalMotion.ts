import { usePage2BackgroundMode } from "./usePage2BackgroundMode";

/** true — фон карты без анимации (режим «off»). */
export function usePortalMotionPaused(): boolean {
  return usePage2BackgroundMode() === "off";
}
