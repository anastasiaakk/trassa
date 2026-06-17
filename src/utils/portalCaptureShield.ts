import { INTRO_DONE_SESSION_KEY } from "../ensureIntroRoute";
import { isIntroSplashActive } from "./introSplashRuntime";
import { isScreenshotShieldDisabledClient } from "./portalMobileCaptureGuard";

const SHIELD_ID = "portal-capture-shield";
const HTML_ACTIVE = "portal-capture-shield-active";

/** Не показывать щит на заставке и до завершения входа. */
export function mayShowCaptureShield(): boolean {
  if (isScreenshotShieldDisabledClient()) return false;
  if (isIntroSplashActive()) return false;
  try {
    return sessionStorage.getItem(INTRO_DONE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

declare global {
  interface Window {
    __trassaActivateCaptureShield?: (holdMs?: number) => void;
    __trassaHideCaptureShield?: () => void;
    __trassaPortalBrowser?: string;
  }
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;
let onDismissCb: (() => void) | null = null;
let wired = false;

function shieldEl(): HTMLElement | null {
  return document.getElementById(SHIELD_ID);
}

function clearHideTimer(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function scheduleAutoHide(ms = 12_000): void {
  clearHideTimer();
  hideTimer = setTimeout(() => hideCaptureShield(), ms);
}

function wireShieldUi(el: HTMLElement): void {
  if (wired) return;
  wired = true;
  el.querySelector(".portal-capture-shield__btn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    hideCaptureShield();
  });
  el.addEventListener("click", (e) => {
    if (e.target === el) hideCaptureShield();
  });
}

function shieldMarkup(): string {
  return `
    <div class="portal-capture-shield__panel">
      <div class="portal-capture-shield__finger" aria-hidden="true">☝️</div>
      <h2 class="portal-capture-shield__title">Кажется, вы пытались нарушить права портала ТрассА</h2>
      <p class="portal-capture-shield__text">Данное действие зафиксировано у администратора. Содержимое портала на этом снимке недоступно.</p>
      <button type="button" class="portal-capture-shield__btn">Понятно</button>
    </div>
  `;
}

function ensureShield(): HTMLElement | null {
  let el = shieldEl();
  if (el) return el;
  el = document.createElement("div");
  el.id = SHIELD_ID;
  el.className = "portal-capture-shield";
  el.setAttribute("role", "alertdialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = shieldMarkup();
  document.body.appendChild(el);
  wireShieldUi(el);
  return el;
}

/** Готовим DOM заранее — щит появляется без паузы на createElement. */
export function prepareCaptureShield(): void {
  ensureShield();
}

export function showCaptureShieldSync(holdMs = 12_000): void {
  if (isScreenshotShieldDisabledClient() || !mayShowCaptureShield()) return;
  if (document.documentElement.classList.contains(HTML_ACTIVE)) {
    scheduleAutoHide(holdMs);
    return;
  }
  const el = ensureShield();
  if (!el) return;
  document.documentElement.classList.add(HTML_ACTIVE);
  el.setAttribute("aria-hidden", "false");
  void el.offsetHeight;
  scheduleAutoHide(holdMs);
}

export function hideCaptureShield(): void {
  clearHideTimer();
  document.documentElement.classList.remove(HTML_ACTIVE);
  const el = shieldEl();
  if (el) {
    el.setAttribute("aria-hidden", "true");
  }
  onDismissCb?.();
}

export function installPortalCaptureShield(onDismiss?: () => void): void {
  if (onDismiss) onDismissCb = onDismiss;
}

export function teardownPortalCaptureShield(): void {
  hideCaptureShield();
  shieldEl()?.remove();
  wired = false;
  onDismissCb = null;
}

let shieldWatchStarted = false;

function startShieldBlockObserver(): void {
  if (shieldWatchStarted || typeof document === "undefined") return;
  if (!isScreenshotShieldDisabledClient()) return;
  shieldWatchStarted = true;
  const obs = new MutationObserver(() => {
    if (document.documentElement.classList.contains(HTML_ACTIVE)) {
      hideCaptureShield();
      document.getElementById(SHIELD_ID)?.remove();
    }
  });
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

export function syncEarlyCaptureShieldApi(): void {
  window.__trassaHideCaptureShield = () => hideCaptureShield();
  if (isScreenshotShieldDisabledClient()) {
    window.__trassaActivateCaptureShield = () => {};
    hideCaptureShield();
    startShieldBlockObserver();
    return;
  }
  window.__trassaActivateCaptureShield = (holdMs) => showCaptureShieldSync(holdMs);
}
