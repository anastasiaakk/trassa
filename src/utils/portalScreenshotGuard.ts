import { hideCaptureShield } from "./portalCaptureShield";
import { isScreenshotShieldDisabledClient } from "./portalMobileCaptureGuard";
import { startVolumeScreenshotGuard } from "./portalVolumeScreenshotGuard";

export function startPortalScreenshotGuard(options?: {
  userName?: string | null | (() => string | null | undefined);
}): () => void {
  hideCaptureShield();
  document.documentElement.classList.remove("portal-capture-shield-active");

  if (isScreenshotShieldDisabledClient()) {
    return () => hideCaptureShield();
  }

  return startVolumeScreenshotGuard(options?.userName);
}

export { hideCaptureShield };
