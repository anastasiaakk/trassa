/**
 * Вырезает оригинальные пиктограммы ролей из макетов page3-refs
 * (те же иконки, что были в TagJS на белом круге).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REFS = path.join(ROOT, "public", "page3-refs");
const OUT = path.join(ROOT, "public", "tagjs");
const IMPORT_DIR = path.join(ROOT, "public", "tagjs-import");

/** id TagJS → файл-референс в public/page3-refs/ */
const REF_MAP = {
  b3pnceya: "role1-school-reference.png",
  "66h5rmum": "role2-student-reference.png",
  "0tenwd9b": "role3-contractor-reference.png",
  boty0uwi: "role4-institution-reference.png",
};

/** Область белого круга с иконкой (карточка 419×329) */
const CROP = { left: 32, top: 252, width: 64, height: 64 };
const ICON_CANVAS = 48;
/** Единый «кегль» глифа: обрезка по контуру и вписывание в квадрат. */
const ICON_GLYPH = 42;
/** Шапка — контурная, без заливки; чуть крупнее для визуального паритета с «тяжёлыми» иконками. */
const GLYPH_BOOST = {
  "66h5rmum": 1.12,
};

/** Оставляем только штрихи пиктограммы (#243B74), убираем белый круг, серый фон карточки и чёрный экспорт. */
function isRoleGlyphPixel(r, g, b) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum >= 175) return false;
  if (r <= 45 && g <= 45 && b <= 45) return false;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  if (spread < 32 && lum >= 80 && lum < 175) return false;
  return b >= r - 8 && b >= g - 5 && lum <= 155 && spread >= 10;
}

function clearIconBackdrop(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isRoleGlyphPixel(r, g, b)) {
      data[i + 3] = 0;
    }
  }
}

/** Убирает фон, обрезает пустые поля, масштабирует глиф в кадре ICON_CANVAS. */
async function normalizeRoleIconPng(srcPath, destPath, id = "") {
  const sharp = require("sharp");
  const boost = GLYPH_BOOST[id] ?? 1;
  const glyphTarget = Math.min(ICON_CANVAS, Math.round(ICON_GLYPH * boost));
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  clearIconBackdrop(data);
  const pad = Math.floor((ICON_CANVAS - glyphTarget) / 2);
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 8 })
    .resize(glyphTarget, glyphTarget, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: pad,
      bottom: ICON_CANVAS - glyphTarget - pad,
      left: pad,
      right: ICON_CANVAS - glyphTarget - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(destPath);
}

async function extractFromRef(id, refFile) {
  const sharp = require("sharp");
  const src = path.join(REFS, refFile);
  const dest = path.join(OUT, `${id}.png`);
  const tmp = path.join(OUT, `${id}.__tmp.png`);
  await sharp(src)
    .extract(CROP)
    .resize(ICON_CANVAS, ICON_CANVAS, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(tmp);
  await normalizeRoleIconPng(tmp, dest, id);
  fs.unlinkSync(tmp);
  return dest;
}

async function prepareRoleIconPng(srcPath, destPath, id = "") {
  await normalizeRoleIconPng(srcPath, destPath, id);
}

async function copyImport(id) {
  for (const ext of [".png", ".svg", ".webp"]) {
    const src = path.join(IMPORT_DIR, `${id}${ext}`);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(OUT, `${id}${ext}`);
    if (ext === ".png") {
      await prepareRoleIconPng(src, dest, id);
    } else {
      fs.copyFileSync(src, dest);
    }
    return dest;
  }
  return null;
}

async function runExtractPage3RoleIcons() {
  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;

  for (const [id, ref] of Object.entries(REF_MAP)) {
    const imported = await copyImport(id);
    if (imported) {
      console.log(`  ${id} <- tagjs-import/${path.basename(imported)}`);
      ok++;
      continue;
    }
    const refPath = path.join(REFS, ref);
    if (fs.existsSync(refPath)) {
      await extractFromRef(id, ref);
      console.log(`  ${id} <- page3-refs/${ref}`);
      ok++;
      continue;
    }
    console.warn(`  skip ${id}: нет tagjs-import и page3-refs/${ref}`);
  }

  console.log(`[extract-page3-role-icons] готово: ${ok}/4`);
  if (ok < 4) {
    console.warn(
      "[extract-page3-role-icons] не хватает иконок — положите PNG в public/tagjs-import/:",
      Object.keys(REF_MAP).join(", ")
    );
  }
}

module.exports = { runExtractPage3RoleIcons };

if (require.main === module) {
  runExtractPage3RoleIcons().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
