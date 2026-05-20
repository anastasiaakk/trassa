/**
 * Убирает из win-unpacked каталоги, из-за которых robocopy на CI уходит в рекурсию
 * (node_modules/trassa-app → корень репо → packaged-app → …, ERROR 1921 / MAX_PATH).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const unpacked = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, "packaged-app", "win-unpacked");

const DROP_DIR_NAMES = new Set([
  "trassa-app",
  "packaged-app",
  "release",
  "setup-wizard",
  ".git",
]);

function rmSafe(target) {
  if (!fs.existsSync(target)) return false;
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    return true;
  } catch (e) {
    console.warn("[sanitize-unpacked] не удалось удалить:", target, e.message || e);
    return false;
  }
}

function walkAndPrune(dir, insideNodeModules) {
  if (!fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const inNm = insideNodeModules || ent.name === "node_modules";
    if (inNm && DROP_DIR_NAMES.has(ent.name) && ent.isDirectory()) {
      if (rmSafe(full)) {
        console.log("[sanitize-unpacked] удалено:", path.relative(unpacked, full));
      }
      continue;
    }
    if (ent.isDirectory()) {
      walkAndPrune(full, inNm);
    }
  }
}

function main() {
  if (!fs.existsSync(unpacked)) {
    console.warn("[sanitize-unpacked] нет каталога:", unpacked);
    return;
  }
  walkAndPrune(unpacked, false);
  const apiNm = path.join(unpacked, "resources", "trassa-api", "node_modules", "trassa-app");
  rmSafe(apiNm);
  console.log("[sanitize-unpacked] OK:", path.relative(root, unpacked));
}

main();
