import { loadCabinetTheme } from "../profileSettingsStorage";
import { getPortalDesign } from "./portalDesign";

/** Синхронизирует data-cabinet-theme на <html> для глобальных CSS v2 (светлая/тёмная). */
export function syncCabinetThemeDocument(theme?: "light" | "dark"): void {
  if (getPortalDesign() !== "v2") {
    delete document.documentElement.dataset.cabinetTheme;
    return;
  }
  document.documentElement.dataset.cabinetTheme = theme ?? loadCabinetTheme();
}
