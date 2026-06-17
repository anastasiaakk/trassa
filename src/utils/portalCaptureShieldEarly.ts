import { hideCaptureShield, syncEarlyCaptureShieldApi } from "./portalCaptureShield";

syncEarlyCaptureShieldApi();
hideCaptureShield();
document.documentElement.classList.remove("portal-capture-shield-active");
document.getElementById("portal-capture-shield")?.remove();
