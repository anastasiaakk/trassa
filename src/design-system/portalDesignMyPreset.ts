import type { Page2BackgroundMode } from "./page2BackgroundMode";
import { getPage2BackgroundMode, setPage2BackgroundMode } from "./page2BackgroundMode";
import type { PortalDesignId } from "./portalDesign";
import { getPortalDesign, setPortalDesign } from "./portalDesign";
import { loadSeasonBackground, type SeasonMode } from "../utils/seasonBackground";

const STORAGE_KEY = "trassa-portal-my-design-preset-v1";

export type PortalMyDesignPreset = {
  version: 1;
  /** Когда нажали «Сохранить мой текущий дизайн». */
  savedAt: string;
  portalDesign: PortalDesignId;
  page2BgMode: Page2BackgroundMode;
  seasonBg: SeasonMode;
};

export function captureCurrentDesignPreset(): PortalMyDesignPreset {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    portalDesign: getPortalDesign(),
    page2BgMode: getPage2BackgroundMode(),
    seasonBg: loadSeasonBackground(),
  };
}

export function loadMyDesignPreset(): PortalMyDesignPreset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PortalMyDesignPreset>;
    if (parsed?.version !== 1) return null;
    if (parsed.portalDesign !== "legacy" && parsed.portalDesign !== "v2") return null;
    if (
      parsed.page2BgMode !== "video" &&
      parsed.page2BgMode !== "lines" &&
      parsed.page2BgMode !== "off"
    ) {
      return null;
    }
    const season = parsed.seasonBg;
    if (
      season !== "off" &&
      season !== "spring" &&
      season !== "summer" &&
      season !== "autumn" &&
      season !== "winter"
    ) {
      return null;
    }
    if (typeof parsed.savedAt !== "string") return null;
    return {
      version: 1,
      savedAt: parsed.savedAt,
      portalDesign: parsed.portalDesign,
      page2BgMode: parsed.page2BgMode,
      seasonBg: season,
    };
  } catch {
    return null;
  }
}

export function saveMyDesignPresetLocal(preset: PortalMyDesignPreset): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
  } catch {
    /* ignore quota */
  }
}

/** Применить сохранённый пресет на этом устройстве (без сервера). */
export function applyMyDesignPreset(preset: PortalMyDesignPreset): void {
  setPortalDesign(preset.portalDesign);
  setPage2BackgroundMode(preset.page2BgMode);
  try {
    localStorage.setItem("trassa-season-bg-v1", JSON.stringify(preset.seasonBg));
    window.dispatchEvent(new CustomEvent("trassa-season-bg-changed"));
  } catch {
    /* ignore */
  }
}

export function formatMyDesignPresetWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
