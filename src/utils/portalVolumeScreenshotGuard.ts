import { INTRO_DONE_SESSION_KEY } from "../ensureIntroRoute";
import { reportPortalViolation } from "../api/violationsApi";
import { isViolationsGuardEnabledClient } from "./violationsGuardMode";
import {
  hideCaptureShield,
  mayShowCaptureShield,
  prepareCaptureShield,
  showCaptureShieldSync,
} from "./portalCaptureShield";
import { isIntroSplashActive } from "./introSplashRuntime";
import { portalNeedsTouchToArmCapture } from "./portalMobileCaptureGuard";

const DEDUPE_MS = 900;
const STARTUP_AFTER_ENGAGE_MS = 1_000;
const TAB_RETURN_COOLDOWN_MS = 800;
const LISTENERS_DELAY_MS = 3_000;

function introCompleted(): boolean {
  try {
    return sessionStorage.getItem(INTRO_DONE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function isVolumeKey(e: KeyboardEvent): boolean {
  const k = e.key;
  const c = e.code;
  return (
    k === "VolumeDown" ||
    k === "VolumeUp" ||
    k === "AudioVolumeDown" ||
    k === "AudioVolumeUp" ||
    c === "VolumeDown" ||
    c === "VolumeUp" ||
    c === "AudioVolumeDown" ||
    c === "AudioVolumeUp"
  );
}

function resolveUserName(
  userName?: string | null | (() => string | null | undefined)
): string | null | undefined {
  return typeof userName === "function" ? userName() : userName;
}

function isPortalTabActive(): boolean {
  return document.visibilityState === "visible" && document.hasFocus();
}

/** Только десктоп: громкость на активной вкладке после явного касания. */
export function startVolumeScreenshotGuard(
  userName?: string | null | (() => string | null | undefined)
): () => void {
  let engaged = false;
  let engagedAt = 0;
  let lastTriggerAt = 0;
  let listenersOn = false;
  let tabCooldownUntil = 0;
  let stopped = false;
  let gestureListenersOn = false;

  const canEngage = () =>
    introCompleted() && !isIntroSplashActive() && mayShowCaptureShield();

  const canReact = () => {
    if (!engaged || !listenersOn) return false;
    if (!canEngage()) return false;
    if (Date.now() - engagedAt < STARTUP_AFTER_ENGAGE_MS) return false;
    if (Date.now() < tabCooldownUntil) return false;
    return isPortalTabActive();
  };

  const fire = () => {
    if (!isViolationsGuardEnabledClient()) return;
    if (!mayShowCaptureShield()) return;
    const now = Date.now();
    if (now - lastTriggerAt < DEDUPE_MS) return;
    lastTriggerAt = now;

    showCaptureShieldSync(12_000);
    void reportPortalViolation("screenshot_volume_keys", resolveUserName(userName));
  };

  const onVolume = (e: KeyboardEvent) => {
    if (!isVolumeKey(e) || e.repeat || !e.isTrusted) return;
    if (!isPortalTabActive()) return;
    if (!canReact()) return;

    try {
      e.preventDefault();
      e.stopImmediatePropagation();
    } catch {
      /* ignore */
    }
    fire();
  };

  const detachVolumeListeners = () => {
    if (!listenersOn) return;
    listenersOn = false;
    document.removeEventListener("keydown", onVolume, true);
  };

  const attachVolumeListeners = () => {
    if (listenersOn || !engaged || stopped) return;
    listenersOn = true;
    prepareCaptureShield();
    document.addEventListener("keydown", onVolume, true);
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      detachVolumeListeners();
      hideCaptureShield();
      return;
    }
    tabCooldownUntil = Date.now() + TAB_RETURN_COOLDOWN_MS;
    attachVolumeListeners();
  };

  const engage = () => {
    if (!canEngage() || engaged) return;
    engaged = true;
    engagedAt = Date.now();
    if (isPortalTabActive()) attachVolumeListeners();
  };

  const onTouch = (e: TouchEvent) => {
    if (!e.isTrusted) return;
    engage();
  };

  const bindListeners = () => {
    if (gestureListenersOn || stopped) return;
    gestureListenersOn = true;
    document.addEventListener("visibilitychange", onVisibility);
    if (portalNeedsTouchToArmCapture()) {
      document.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    } else {
      engage();
    }
  };

  const delayTimer = window.setTimeout(bindListeners, LISTENERS_DELAY_MS);

  return () => {
    stopped = true;
    clearTimeout(delayTimer);
    detachVolumeListeners();
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("touchstart", onTouch, true);
    hideCaptureShield();
  };
}
