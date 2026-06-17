import { applyDesignTokens, clearDesignTokenInlineStyles } from "./portalDesignTokens";
import { syncCabinetThemeDocument } from "./syncCabinetThemeDocument";
import { setPage2BackgroundMode } from "./page2BackgroundMode";
import {
  CABINET_THEME_CHANGED,
  reconcileUnifiedCabinetLight,
} from "../profileSettingsStorage";

export type PortalDesignId = "legacy" | "v2";

const STORAGE_KEY = "trassa-portal-design";

function readStoredDesign(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : raw;
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

/** Как на trassa.duckdns.org: сервер отдаёт portal_design: "legacy". */
export function getPortalDesign(): PortalDesignId {
  const v = readStoredDesign();
  if (v === "v2") return "v2";
  if (v === "legacy") return "legacy";
  return "legacy";
}

export const PORTAL_DESIGN_CHANGED = "trassa-portal-design-changed";

export function setPortalDesign(id: PortalDesignId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  applyPortalDesign(id);
  window.dispatchEvent(new Event(PORTAL_DESIGN_CHANGED));
}

/** Вызвать до первого paint (index.tsx). */
export function initPortalDesign(): PortalDesignId {
  if (typeof window !== "undefined" && reconcileUnifiedCabinetLight()) {
    window.dispatchEvent(new Event(CABINET_THEME_CHANGED));
  }
  const id = getPortalDesign();
  applyPortalDesign(id);

  if (typeof window !== "undefined") {
    window.addEventListener(PORTAL_DESIGN_CHANGED, () => {
      applyPortalDesign();
    });
  }

  return id;
}

export function applyPortalDesign(id: PortalDesignId = getPortalDesign()): void {
  document.documentElement.dataset.portalDesign = id;
  if (id === "v2") {
    syncCabinetThemeDocument();
    applyDesignTokens();
  } else {
    delete document.documentElement.dataset.cabinetTheme;
    clearDesignTokenInlineStyles();
  }
}

/** Классический вид портала (как на проде): legacy + видеофон страницы услуг. */
export function applyLegacyPortalDesignPreset(): void {
  setPortalDesign("legacy");
  setPage2BackgroundMode("video");
}
