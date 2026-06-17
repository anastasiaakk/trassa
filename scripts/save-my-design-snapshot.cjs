/**
 * Закрепить текущие CSS/тему в design-legacy/my-design (перезаписывает снимок).
 * Запуск: npm run design:pin
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "design-legacy", "my-design");

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
      if (name === "design-legacy") continue;
      walkCss(full, acc);
    } else if (/\.(css|module\.css)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

function run() {
  const cssFiles = walkCss(SRC);
  const all = [...new Set([...EXTRA.map((p) => path.join(ROOT, p)), ...cssFiles])];
  if (fs.existsSync(OUT)) {
    fs.rmSync(OUT, { recursive: true, force: true });
  }
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
      "Ваш закреплённый дизайн (файлы стилей):",
      "  npm run design:restore-pin",
      "",
      "После восстановления: Ctrl+F5 в браузере.",
    ].join("\n"),
    "utf8"
  );
  console.log(`[save-my-design] ${manifest.length} файлов → ${OUT}`);
}

run();
