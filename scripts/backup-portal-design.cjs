/**
 * Снимок текущих стилей портала для отката (design-legacy/snapshot-*).
 * Запуск: node scripts/backup-portal-design.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const STAMP = new Date().toISOString().slice(0, 10);
const OUT = path.join(ROOT, "design-legacy", `snapshot-${STAMP}`);

const EXTRA = [
  "src/theme/cabinetPalettes.ts",
  "src/theme.css",
  "src/typography.css",
  "src/global.css",
  "src/App.css",
  "src/index.css",
];

function walkCss(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === "design-legacy" || name === "design-system") continue;
      walkCss(full, acc);
    } else if (/\.(css|module\.css)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function copyFile(srcRel) {
  const src = path.join(ROOT, srcRel.replace(/^src[\\/]/, "src/"));
  if (!fs.existsSync(src)) return false;
  const dest = path.join(OUT, srcRel.replace(/^src[\\/]/, "src/"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function run() {
  const cssFiles = walkCss(SRC);
  const all = [...new Set([...EXTRA.map((p) => path.join(ROOT, p)), ...cssFiles])];
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = [];
  for (const src of all) {
    if (!fs.existsSync(src)) continue;
    const rel = path.relative(ROOT, src);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    manifest.push(rel);
  }
  fs.writeFileSync(
    path.join(OUT, "MANIFEST.json"),
    JSON.stringify({ createdAt: new Date().toISOString(), files: manifest.sort() }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(OUT, "RESTORE.txt"),
    [
      "Восстановление снимка:",
      `  node scripts/restore-portal-design.cjs ${path.basename(OUT)}`,
      "",
      "Или вручную: скопируйте файлы из этой папки обратно в my-react-app/ с теми же путями.",
    ].join("\n"),
    "utf8"
  );
  console.log(`[backup-portal-design] ${manifest.length} файлов → ${OUT}`);
}

run();
