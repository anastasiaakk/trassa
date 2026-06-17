export const INTRO_SPLASH_ACTIVE_ATTR = "data-entry-splash-active";
export const INTRO_SPLASH_EVENT = "trassa-entry-splash-active";

export function isIntroSplashActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute(INTRO_SPLASH_ACTIVE_ATTR) === "1";
}

export function setIntroSplashActive(active: boolean): void {
  if (typeof document === "undefined") return;
  if (active) {
    document.documentElement.setAttribute(INTRO_SPLASH_ACTIVE_ATTR, "1");
  } else {
    document.documentElement.removeAttribute(INTRO_SPLASH_ACTIVE_ATTR);
  }
  window.dispatchEvent(new CustomEvent(INTRO_SPLASH_EVENT, { detail: { active } }));
}

export function whenIntroSplashDone(run: () => void): void {
  if (!isIntroSplashActive()) {
    run();
    return;
  }
  const onChange = () => {
    if (!isIntroSplashActive()) {
      window.removeEventListener(INTRO_SPLASH_EVENT, onChange);
      run();
    }
  };
  window.addEventListener(INTRO_SPLASH_EVENT, onChange);
}
