import type { ViolationKind } from "../api/violationsApi";
import {
  applyPortalBrowserMarker,
  detectPortalBrowser,
  isBlinkMobileBrowser,
  isMiuiDevice,
  isWebKitMobileBrowser,
  isYandexAndroidBrowser,
} from "./portalCaptureBrowser";

function isHardwareVolumeKey(e: KeyboardEvent): boolean {
  const k = e.key;
  const c = e.code;
  const kc = e.keyCode || (e as KeyboardEvent & { which?: number }).which || 0;
  return (
    k === "VolumeDown" ||
    k === "VolumeUp" ||
    k === "AudioVolumeDown" ||
    k === "AudioVolumeUp" ||
    c === "VolumeDown" ||
    c === "VolumeUp" ||
    c === "AudioVolumeDown" ||
    c === "AudioVolumeUp" ||
    kc === 24 ||
    kc === 25 ||
    kc === 175 ||
    kc === 176
  );
}

function isMacScreenshotKey(e: KeyboardEvent): boolean {
  return e.metaKey && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5");
}

/** Доп. перехват под Safari / Chrome / Яндекс (синхронно с ранним скриптом). */
export function startBrowserCaptureWatch(
  fire: (kind: ViolationKind) => void,
  stopped: () => boolean,
  showShield: () => void
): () => void {
  applyPortalBrowserMarker();
  const browser = detectPortalBrowser();
  const cleanups: Array<() => void> = [];

  const arm = (kind: ViolationKind) => {
    if (stopped()) return;
    showShield();
    fire(kind);
  };

  if (isWebKitMobileBrowser(browser)) {
    let hiddenAt = 0;
    let lastInnerH = window.innerHeight;
    let lastVvH = window.visualViewport?.height ?? lastInnerH;

    const onVis = () => {
      if (stopped()) return;
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        showShield();
        return;
      }
      if (hiddenAt > 0) {
        const dt = Date.now() - hiddenAt;
        hiddenAt = 0;
        if (dt >= 40 && dt <= 4_000) arm("screenshot_mobile_hint");
      }
    };

    const onBlur = () => {
      if (stopped() || document.visibilityState !== "visible") return;
      showShield();
    };

    const onFreeze = () => {
      if (!stopped()) arm("screenshot_mobile_hint");
    };

    const onResize = () => {
      if (stopped() || document.visibilityState !== "visible") return;
      const dh = Math.abs(window.innerHeight - lastInnerH);
      lastInnerH = window.innerHeight;
      if (dh >= 40 && dh < window.innerHeight * 0.45) arm("screenshot_mobile_viewport");
    };

    const onVvResize = () => {
      if (stopped() || document.visibilityState !== "visible") return;
      const vv = window.visualViewport;
      if (!vv) return;
      const dh = Math.abs(vv.height - lastVvH);
      lastVvH = vv.height;
      if (dh >= 36) arm("screenshot_mobile_viewport");
    };

    let unfocused = 0;
    const focusPoll = window.setInterval(() => {
      if (stopped() || document.visibilityState !== "visible") return;
      if (!document.hasFocus()) {
        if (!unfocused) {
          unfocused = Date.now();
          showShield();
        }
        return;
      }
      if (unfocused > 0) {
        const dt = Date.now() - unfocused;
        unfocused = 0;
        if (dt >= 80 && dt <= 2_500) arm("screenshot_mobile_focus");
      }
    }, 45);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur, true);
    document.addEventListener("freeze", onFreeze);
    window.addEventListener("resize", onResize, true);
    window.visualViewport?.addEventListener("resize", onVvResize);
    cleanups.push(() => {
      clearInterval(focusPoll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur, true);
      document.removeEventListener("freeze", onFreeze);
      window.removeEventListener("resize", onResize, true);
      window.visualViewport?.removeEventListener("resize", onVvResize);
    });
  }

  if (isBlinkMobileBrowser(browser)) {
    const miui = isMiuiDevice();
    const yandex = isYandexAndroidBrowser(browser);
    const resizeMin = miui || yandex ? 18 : 40;
    const vvMin = miui || yandex ? 14 : 36;
    let lastInnerH = window.innerHeight;
    let lastVvH = window.visualViewport?.height ?? lastInnerH;

    const onVol = (e: KeyboardEvent) => {
      if (stopped() || !isHardwareVolumeKey(e)) return;
      showShield();
      try {
        e.preventDefault();
        e.stopImmediatePropagation();
      } catch {
        /* ignore */
      }
      arm("screenshot_volume_keys");
    };
    window.addEventListener("keydown", onVol, true);
    window.addEventListener("keyup", onVol, true);
    cleanups.push(() => {
      window.removeEventListener("keydown", onVol, true);
      window.removeEventListener("keyup", onVol, true);
    });

    const onMiuiViewport = () => {
      if (stopped() || document.visibilityState !== "visible") return;
      const vv = window.visualViewport;
      if (vv) {
        const dh = Math.abs(vv.height - lastVvH);
        lastVvH = vv.height;
        if (dh >= vvMin) arm("screenshot_mobile_viewport");
      }
      const dInner = Math.abs(window.innerHeight - lastInnerH);
      lastInnerH = window.innerHeight;
      if (dInner >= resizeMin && dInner < window.innerHeight * 0.5) {
        arm("screenshot_mobile_viewport");
      }
    };
    window.addEventListener("resize", onMiuiViewport, true);
    window.visualViewport?.addEventListener("resize", onMiuiViewport);
    window.visualViewport?.addEventListener("scroll", onMiuiViewport);
    cleanups.push(() => {
      window.removeEventListener("resize", onMiuiViewport, true);
      window.visualViewport?.removeEventListener("resize", onMiuiViewport);
      window.visualViewport?.removeEventListener("scroll", onMiuiViewport);
    });

    if (yandex || miui) {
      const onTouch = (e: TouchEvent) => {
        if (stopped() || e.touches.length < 3) return;
        arm("screenshot_mobile_hint");
      };
      document.addEventListener("touchstart", onTouch, { capture: true, passive: true });
      cleanups.push(() => document.removeEventListener("touchstart", onTouch, true));
    }

    const onVisBlink = () => {
      if (stopped()) return;
      if (document.visibilityState === "hidden") {
        showShield();
      } else if (miui || yandex) {
        showShield();
      }
    };
    document.addEventListener("visibilitychange", onVisBlink);
    cleanups.push(() => document.removeEventListener("visibilitychange", onVisBlink));

    let unfocusedB = 0;
    const pollMs = yandex ? 28 : 50;
    const focusPoll = window.setInterval(() => {
      if (stopped() || document.visibilityState !== "visible") return;
      if (!document.hasFocus()) {
        if (!unfocusedB) {
          unfocusedB = Date.now();
          showShield();
        }
        return;
      }
      if (unfocusedB > 0) {
        const dt = Date.now() - unfocusedB;
        unfocusedB = 0;
        if (dt >= 60 && dt <= 3_000) arm("screenshot_mobile_focus");
      }
    }, pollMs);
    cleanups.push(() => clearInterval(focusPoll));
  }

  const onCopy = () => {
    if (!stopped()) arm("screenshot_copy");
  };
  const onContextMenu = (e: Event) => {
    if (stopped()) return;
    e.preventDefault();
    showShield();
    arm("screenshot_context_menu");
  };
  document.addEventListener("copy", onCopy);
  document.addEventListener("cut", onCopy);
  document.addEventListener("contextmenu", onContextMenu, true);
  cleanups.push(() => {
    document.removeEventListener("copy", onCopy);
    document.removeEventListener("cut", onCopy);
    document.removeEventListener("contextmenu", onContextMenu, true);
  });

  if (browser === "safari-desktop" || browser === "chrome-desktop" || browser === "yandex-desktop") {
    const onKey = (e: KeyboardEvent) => {
      if (stopped()) return;
      if (
        e.key === "PrintScreen" ||
        e.key === "Snapshot" ||
        isMacScreenshotKey(e) ||
        ((e.key === "s" || e.key === "S") && e.shiftKey && (e.metaKey || e.ctrlKey))
      ) {
        showShield();
        arm("screenshot_keyboard");
      }
    };
    window.addEventListener("keydown", onKey, true);
    cleanups.push(() => window.removeEventListener("keydown", onKey, true));
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}
