/**
 * Восстановление снимка: node scripts/restore-portal-design.cjs snapshot-2026-05-20
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const name = process.argv[2];
if (!name) {
  console.error("Укажите папку снимка, например: snapshot-2026-05-20");
  process.exit(1);
}

const SNAP = path.join(ROOT, "design-legacy", name);
const manifestPath = path.join(SNAP, "MANIFEST.json");
if (!fs.existsSync(manifestPath)) {
  console.error("Нет MANIFEST.json в", SNAP);
  process.exit(1);
}

const { files } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
for (const rel of files) {
  const src = path.join(SNAP, rel);
  const dest = path.join(ROOT, rel);
  if (!fs.existsSync(src)) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
console.log(`[restore-portal-design] восстановлено ${files.length} файлов из ${name}`);
