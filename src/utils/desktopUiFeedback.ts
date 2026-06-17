/** Короткий клик в desktop-приложении (опционально, localStorage). */

export const UI_SOUNDS_CHANGED = "trassa-ui-sounds-changed";

const STORAGE_KEY = "trassa-ui-sounds";

export function isDesktopShell(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { trassaDesktop?: unknown }).trassaDesktop
  );
}

export function getUiSoundsEnabled(): boolean {
  if (!isDesktopShell()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUiSoundsEnabled(enabled: boolean): void {
  if (!isDesktopShell()) return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(UI_SOUNDS_CHANGED));
}

/** Мягкий одиночный «тап» (~80 ms), без файлов. */
export function playUiTapSound(): void {
  if (!getUiSoundsEnabled()) return;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const run = () => {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.06, now + 0.008);
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      master.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(640, now);
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 0.09);
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(() => {
        run();
        window.setTimeout(() => ctx.close(), 200);
      });
    } else {
      run();
      window.setTimeout(() => ctx.close(), 200);
    }
  } catch {
    /* autoplay policy */
  }
}
