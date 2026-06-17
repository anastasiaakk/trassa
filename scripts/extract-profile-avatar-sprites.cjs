/**
 * Нарезка спрайт-листа аватаров (3×4) в отдельные PNG для public/profile-avatars/.
 *
 * Usage:
 *   node scripts/extract-profile-avatar-sprites.cjs [path-to-sheet.png]
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DEFAULT_SOURCE = path.join(
  __dirname,
  "..",
  "public",
  "profile-avatars",
  "_source-sheet.png",
);

const PRESETS = [
  ["excavator", 0, 0],
  ["bulldozer", 1, 0],
  ["crane", 2, 0],
  ["dump-truck", 3, 0],
  ["hardhat", 0, 1],
  ["loader", 1, 1],
  ["cone", 2, 1],
  ["roller", 3, 1],
  ["blueprint", 0, 2],
  ["mixer", 1, 2],
  ["bridge", 2, 2],
  ["worker", 3, 2],
];

const COLS = 4;
const ROWS = 3;
const OUT_SIZE = 256;
/** Отступ от края ячейки, чтобы не захватывать соседние иконки. */
const CELL_INSET = 10;

async function main() {
  const source = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE;
  const outDir = path.join(__dirname, "..", "public", "profile-avatars");

  if (!fs.existsSync(source)) {
    console.error(`Source not found: ${source}`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const meta = await sharp(source).metadata();
  const sheetW = meta.width ?? 0;
  const sheetH = meta.height ?? 0;
  const cellW = sheetW / COLS;
  const cellH = sheetH / ROWS;

  console.log(`[extract-profile-avatar-sprites] ${source} → ${sheetW}×${sheetH}, cell ${cellW}×${cellH}`);

  for (const [id, col, row] of PRESETS) {
    const left = Math.round(col * cellW + CELL_INSET);
    const top = Math.round(row * cellH + CELL_INSET);
    const width = Math.round(cellW - CELL_INSET * 2);
    const height = Math.round(cellH - CELL_INSET * 2);

    const outPath = path.join(outDir, `${id}.png`);
    await sharp(source)
      .extract({ left, top, width, height })
      .resize(OUT_SIZE, OUT_SIZE, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    console.log(`  ${id}.png`);
  }

  if (path.resolve(source) !== path.resolve(DEFAULT_SOURCE)) {
    fs.copyFileSync(source, DEFAULT_SOURCE);
    console.log(`  _source-sheet.png (archived)`);
  }

  console.log("[extract-profile-avatar-sprites] готово:", PRESETS.length, "файлов");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
