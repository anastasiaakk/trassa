import { publicUrl } from "../utils/publicUrl";

/**
 * Установщик и манифест обновлений — те же URL, что в release-config.json (GitHub Releases).
 * Переопределение: VITE_TRASSA_RELEASES_BASE=https://github.com/…/releases/latest/download
 */
const releasesBase =
  (import.meta.env.VITE_TRASSA_RELEASES_BASE as string | undefined)?.trim().replace(/\/+$/, "") ||
  "https://github.com/anastasiaakk/trassa/releases/latest/download";

export const TRASSA_SETUP_DOWNLOAD_URL = `${releasesBase}/trassa-setup.exe`;
export const TRASSA_APP_UPDATE_MANIFEST_URL = `${releasesBase}/app-update.json`;

/** Локальная копия на сайте (после npm run electron:build → sync-setup-download). */
export const TRASSA_SETUP_LOCAL_URL = publicUrl("downloads/trassa-setup.exe");
export const TRASSA_APP_UPDATE_LOCAL_URL = publicUrl("app-update.json");
