/**
 * Встраивает electron-assets/icon.ico в .exe (rcedit).
 * Нужно, потому что при signAndEditExecutable: false electron-builder не вызывает rcedit — остаётся иконка Electron.
 *
 * Использование:
 *   node scripts/embed-win-icon.cjs [путь\\к\\файлу.exe]
 * По умолчанию: packaged-app/win-unpacked/Трасса.exe
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const icoPath = path.join(root, "electron-assets", "icon.ico");

const unpackedDir = path.join(root, "packaged-app", "win-unpacked");
const defaultExe = path.join(unpackedDir, "Трасса.exe");

function pickExePath() {
  const arg = process.argv[2];
  if (arg) return path.resolve(arg);
  if (fs.existsSync(defaultExe)) return defaultExe;
  try {
    if (!fs.existsSync(unpackedDir)) return defaultExe;
    const exe = fs
      .readdirSync(unpackedDir)
      .find((name) => name.toLowerCase().endsWith(".exe"));
    return exe ? path.join(unpackedDir, exe) : defaultExe;
  } catch {
    return defaultExe;
  }
}
const exePath = pickExePath();

async function main() {
  if (!fs.existsSync(icoPath)) {
    console.error("[embed-win-icon] нет файла:", icoPath);
    process.exit(1);
  }
  if (!fs.existsSync(exePath)) {
    const msg = `[embed-win-icon] нет исполняемого файла: ${exePath}`;
    if (process.env.CI === "true") {
      console.warn(msg);
      console.warn("[embed-win-icon] CI: пропускаем встраивание иконки.");
      return;
    }
    console.error(msg);
    process.exit(1);
  }
  const { rcedit } = await import("rcedit");
  try {
    await rcedit(exePath, { icon: icoPath });
    console.log("[embed-win-icon] OK:", exePath);
  } catch (err) {
    if (process.env.CI === "true") {
      console.warn("[embed-win-icon] CI: rcedit не сработал, продолжаем без ошибки.");
      console.warn(String(err?.message || err));
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
