import type { ViolationKind } from "../api/violationsApi";

export function isMobilePortalDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(ua);
  const touchCapable = navigator.maxTouchPoints > 0;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 960px)").matches;
  return mobileUa || (touchCapable && narrow) || (coarse && narrow);
}

/** Телефон/планшет/тач — в браузере щит даёт только ложные срабатывания. */
export function isScreenshotShieldDisabledClient(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|HarmonyOS/i.test(ua)) {
    return true;
  }
  if (navigator.maxTouchPoints > 0) return true;
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
  } catch {
    /* ignore */
  }
  return isMobilePortalDevice();
}

/** Телефон/планшет с тачем — не включать «десктопный» режим защиты без касания. */
export function portalNeedsTouchToArmCapture(): boolean {
  return isMobilePortalDevice() || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
}

function isHardwareVolumeKey(e: KeyboardEvent): boolean {
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

function startVolumeKeyWatch(
  fire: (kind: ViolationKind) => void,
  stopped: () => boolean,
  showShield: () => void
): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (stopped() || !isHardwareVolumeKey(e)) return;
    showShield();
    try {
      e.preventDefault();
      e.stopImmediatePropagation();
    } catch {
      /* ignore */
    }
    fire("screenshot_volume_keys");
  };

  window.addEventListener("keydown", onKey, true);
  window.addEventListener("keyup", onKey, true);
  return () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("keyup", onKey, true);
  };
}

export function applyMobileAntiCaptureStyles(): () => void {
  const root = document.documentElement;
  root.classList.add("portal-mobile-capture-guard");
  return () => root.classList.remove("portal-mobile-capture-guard");
}

export function startMobileCaptureWatch(
  fire: (kind: ViolationKind) => void,
  stopped: () => boolean,
  showShield: () => void
): () => void {
  let hiddenAt = 0;
  let unfocusedSince = 0;
  let lastViewportH = window.visualViewport?.height ?? window.innerHeight;
  let focusEpisodeFired = false;

  const onVisibility = () => {
    if (stopped()) return;
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    if (hiddenAt > 0) {
      const dt = Date.now() - hiddenAt;
      hiddenAt = 0;
      if (dt >= 50 && dt <= 3_500) {
        showShield();
        fire("screenshot_mobile_hint");
      }
    }
  };

  const onPageHide = () => {
    if (stopped()) return;
    hiddenAt = Date.now();
  };

  const onViewportResize = () => {
    if (stopped()) return;
    const vv = window.visualViewport;
    if (!vv || document.visibilityState !== "visible") return;
    const h = vv.height;
    const dh = Math.abs(h - lastViewportH);
    lastViewportH = h;
    if (dh >= 48 && dh < window.innerHeight * 0.42) {
      showShield();
      fire("screenshot_mobile_viewport");
    }
  };

  const onCopy = () => {
    if (!stopped()) {
      showShield();
      fire("screenshot_copy");
    }
  };

  const onContextMenu = (e: Event) => {
    if (stopped()) return;
    e.preventDefault();
    showShield();
    fire("screenshot_context_menu");
  };

  const focusInterval = window.setInterval(() => {
    if (stopped()) return;
    const visible = document.visibilityState === "visible";
    const focused = document.hasFocus();
    if (visible && !focused) {
      if (!unfocusedSince) {
        unfocusedSince = Date.now();
        showShield();
      }
      return;
    }
    if (unfocusedSince > 0 && visible && focused) {
      const dt = Date.now() - unfocusedSince;
      unfocusedSince = 0;
      if (dt >= 100 && dt <= 2_200 && !focusEpisodeFired) {
        focusEpisodeFired = true;
        fire("screenshot_mobile_focus");
        window.setTimeout(() => {
          focusEpisodeFired = false;
        }, 5_000);
      }
    } else if (focused) {
      unfocusedSince = 0;
    }
  }, 80);

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.visualViewport?.addEventListener("resize", onViewportResize);
  document.addEventListener("copy", onCopy);
  document.addEventListener("cut", onCopy);
  document.addEventListener("contextmenu", onContextMenu, true);

  const stopVolume = startVolumeKeyWatch(fire, stopped, showShield);

  return () => {
    stopVolume();
    clearInterval(focusInterval);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    window.visualViewport?.removeEventListener("resize", onViewportResize);
    document.removeEventListener("copy", onCopy);
    document.removeEventListener("cut", onCopy);
    document.removeEventListener("contextmenu", onContextMenu, true);
  };
}
