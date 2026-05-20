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

async function extractFromRef(id, refFile) {
  const sharp = require("sharp");
  const src = path.join(REFS, refFile);
  const dest = path.join(OUT, `${id}.png`);
  const width = id === "66h5rmum" ? 58 : 48;
  const height = 48;
  await sharp(src)
    .extract(CROP)
    .resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(dest);
  return dest;
}

/** Убирает чёрный/тёмный фон экспорта Figma — иконка на белом круге кнопки */
async function prepareRoleIconPng(srcPath, destPath) {
  const sharp = require("sharp");
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const threshold = 42;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
    }
  }
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(destPath);
}

async function copyImport(id) {
  for (const ext of [".png", ".svg", ".webp"]) {
    const src = path.join(IMPORT_DIR, `${id}${ext}`);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(OUT, `${id}${ext}`);
    if (ext === ".png") {
      await prepareRoleIconPng(src, dest);
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
    if (!fs.existsSync(refPath)) {
      console.warn(`  skip ${id}: нет public/page3-refs/${ref}`);
      continue;
    }
    await extractFromRef(id, ref);
    console.log(`  ${id} <- page3-refs/${ref}`);
    ok++;
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
