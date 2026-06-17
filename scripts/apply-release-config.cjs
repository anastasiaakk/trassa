/**
 * Перед vite build: пишет public/app-update.json и electron-assets/update.json
 * из release-config.json или переменной окружения TRASSA_PUBLIC_URL.
 *
 * Укажите один раз публичный HTTPS-адрес сайта (без слэша в конце), например:
 *   https://example.com
 * После деплоя сайта манифест будет по адресу:
 *   https://example.com/app-update.json
 * Установщик — как и кнопка «Скачать»: /downloads/trassa-setup.exe
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const releasePath = path.join(root, "release-config.json");

/** Прямой URL JSON (например GitHub Releases: .../releases/latest/download/app-update.json) */
function readExplicitManifestUrl() {
  const fromEnv = process.env.TRASSA_MANIFEST_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  try {
    if (!fs.existsSync(releasePath)) return "";
    const j = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    const u = j?.manifestUrl;
    return typeof u === "string" ? u.trim().replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

function readPublicBaseUrl() {
  const fromEnv = process.env.TRASSA_PUBLIC_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  try {
    if (!fs.existsSync(releasePath)) return "";
    const j = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    const u = j?.publicBaseUrl;
    return typeof u === "string" ? u.trim().replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

/** Общий API организации (все установщики ходят сюда). */
function readApiUrl() {
  const fromEnv = process.env.TRASSA_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  try {
    if (!fs.existsSync(releasePath)) return "";
    const j = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    const u = j?.apiUrl;
    return typeof u === "string" ? u.trim().replace(/\/+$/, "") : "";
  } catch {
    return "";
  }
}

function isLocalApiUrl(url) {
  if (!url) return true;
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(url);
}

function writeDesktopBuildEnv(apiUrl) {
  const envPath = path.join(root, ".env.production.local");
  const lines = ["# Сгенерировано scripts/apply-release-config.cjs — не редактируйте вручную", "VITE_USE_AUTH_API=true"];
  if (apiUrl) {
    lines.push(`VITE_API_URL=${apiUrl}`);
  }
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
  console.log(
    "[apply-release-config] .env.production.local ←",
    apiUrl ? `VITE_API_URL=${apiUrl}` : "без VITE_API_URL (локальный API на ПК)"
  );
}

function writeElectronApiConfig(apiUrl) {
  const useRemoteApi = Boolean(apiUrl && !isLocalApiUrl(apiUrl));
  const apiPath = path.join(root, "electron-assets", "api.json");
  const payload = {
    apiUrl: apiUrl || "",
    useRemoteApi,
  };
  fs.writeFileSync(apiPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(
    "[apply-release-config] electron-assets/api.json ←",
    useRemoteApi ? `общий сервер ${apiUrl}` : "локальный API на каждом ПК"
  );
}

function main() {
  const installerMode = process.argv.includes("--installer");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const version = pkg.version || "0.0.0";
  const base = readPublicBaseUrl();
  const explicitManifest = readExplicitManifestUrl();
  const apiUrl = readApiUrl();

  writeDesktopBuildEnv(apiUrl);
  writeElectronApiConfig(apiUrl);

  if (installerMode && !apiUrl) {
    console.error(
      "\n[apply-release-config] Для установщика с общей базой укажите apiUrl в release-config.json\n" +
        '  пример: "apiUrl": "https://api.ваш-домен.ru"\n' +
        "  или переменную окружения TRASSA_API_URL при сборке.\n" +
        "  См. docs/deploy/ORG-SERVER.md\n"
    );
    process.exit(1);
  }

  if (installerMode && isLocalApiUrl(apiUrl)) {
    console.warn(
      "[apply-release-config] apiUrl указывает на localhost — синхронизация между разными ПК работать не будет."
    );
  }

  const publicDir = path.join(root, "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  /** Манифест для сайта: относительные URL — приложение разрешает их относительно manifestUrl. */
  const appUpdate = {
    version,
    setupUrl: "/downloads/trassa-setup.exe",
    releaseNotes: "",
  };
  fs.writeFileSync(
    path.join(publicDir, "app-update.json"),
    JSON.stringify(appUpdate, null, 2) + "\n",
    "utf8"
  );
  console.log("[apply-release-config] public/app-update.json ← version", version);

  const updateDefaults = {
    startupDelayMs: 12000,
    checkIntervalHours: apiUrl && !isLocalApiUrl(apiUrl) ? 6 : 24,
    remindLaterDays: 7,
  };
  const updatePath = path.join(root, "electron-assets", "update.json");
  let prev = {};
  try {
    if (fs.existsSync(updatePath)) {
      prev = JSON.parse(fs.readFileSync(updatePath, "utf8"));
    }
  } catch {
    /* ignore */
  }

  const manifestUrl =
    explicitManifest ||
    (apiUrl && !isLocalApiUrl(apiUrl)
      ? `${apiUrl.replace(/\/+$/, "")}/api/app-update/manifest`
      : "") ||
    (base && (base.startsWith("https://") || base.startsWith("http://"))
      ? `${base.replace(/\/+$/, "")}/app-update.json`
      : "");

  if (!manifestUrl) {
    const next = { ...updateDefaults, ...prev, manifestUrl: "" };
    fs.writeFileSync(updatePath, JSON.stringify(next, null, 2) + "\n", "utf8");
    console.warn(
      "[apply-release-config] Задайте TRASSA_PUBLIC_URL, release-config.json → publicBaseUrl или manifestUrl — иначе автообновление в приложении выключено. public/app-update.json всё равно сгенерирован."
    );
    return;
  }

  if (!manifestUrl.startsWith("https://")) {
    console.warn(
      "[apply-release-config] Для автообновления нужен https://. Сейчас manifestUrl:",
      manifestUrl
    );
  }

  const next = {
    ...prev,
    ...updateDefaults,
    manifestUrl,
  };
  fs.writeFileSync(updatePath, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log("[apply-release-config] electron-assets/update.json manifestUrl ←", manifestUrl);
}

main();
