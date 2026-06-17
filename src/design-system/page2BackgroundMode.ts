import { isDesktopShell } from "../utils/desktopUiFeedback";

export type Page2BackgroundMode = "video" | "lines" | "off";

const STORAGE_KEY = "trassa-page2-bg-mode";
const LEGACY_PAUSED_KEY = "trassa-portal-motion-paused";

export const PAGE2_BACKGROUND_CHANGED = "trassa-page2-background-changed";

export function getPage2BackgroundMode(): Page2BackgroundMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "video" || v === "lines" || v === "off") return v;
    if (localStorage.getItem(LEGACY_PAUSED_KEY) === "1") return "off";
  } catch {
    /* ignore */
  }
  /** В браузере по умолчанию лёгкий SVG-фон (page2-bg.mov ~80 MB). Видео — в десктопе или из админки. */
  if (isDesktopShell()) return "video";
  if (typeof window !== "undefined" && window.location.protocol === "file:") return "video";
  return "lines";
}

export function setPage2BackgroundMode(mode: Page2BackgroundMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
    localStorage.removeItem(LEGACY_PAUSED_KEY);
  } catch {
    /* ignore */
  }
  applyPage2BackgroundMode(mode);
  window.dispatchEvent(new Event(PAGE2_BACKGROUND_CHANGED));
}

export function initPage2BackgroundMode(): Page2BackgroundMode {
  const mode = getPage2BackgroundMode();
  applyPage2BackgroundMode(mode);
  return mode;
}

export function applyPage2BackgroundMode(mode: Page2BackgroundMode = getPage2BackgroundMode()): void {
  document.documentElement.dataset.page2Bg = mode;
  if (mode === "off") {
    document.documentElement.dataset.portalMotion = "paused";
  } else {
    delete document.documentElement.dataset.portalMotion;
  }
}

/** @deprecated используйте getPage2BackgroundMode() === "off" */
export function getPortalMotionPaused(): boolean {
  return getPage2BackgroundMode() === "off";
}

/** @deprecated используйте setPage2BackgroundMode */
export function setPortalMotionPaused(paused: boolean): void {
  setPage2BackgroundMode(paused ? "off" : "video");
}

export const PORTAL_MOTION_CHANGED = PAGE2_BACKGROUND_CHANGED;

export function initPortalMotion(): boolean {
  return initPage2BackgroundMode() === "off";
}

export function applyPortalMotion(paused?: boolean): void {
  if (typeof paused === "boolean") {
    setPage2BackgroundMode(paused ? "off" : "video");
    return;
  }
  applyPage2BackgroundMode();
}
