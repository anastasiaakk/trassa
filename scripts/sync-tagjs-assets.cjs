/**
 * Копирует оригинальные ассеты из `фреймы/Радор/public` в `public/tagjs/`
 * под именами TagJS-id, чтобы в приложении снова отображались те же картинки, что в макете.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROGRAMM = path.join(ROOT, "..");
const OUT = path.join(ROOT, "public", "tagjs");

function findFramesRadorPublic() {
  const framesDir = path.join(PROGRAMM, "фреймы");
  if (!fs.existsSync(framesDir)) return null;
  for (const name of fs.readdirSync(framesDir)) {
    if (name.toLowerCase().includes("радор") || name === "Радор") {
      const pub = path.join(framesDir, name, "public");
      if (fs.existsSync(pub)) return pub;
    }
  }
  /** fallback: единственная папка с public/5001@2x.png */
  for (const name of fs.readdirSync(framesDir)) {
    const pub = path.join(framesDir, name, "public");
    const logo = path.join(pub, "5001@2x.png");
    if (fs.existsSync(logo)) return pub;
  }
  return null;
}

/** TagJS id → файл в макете Радор (или запасной в проекте) */
const MAP_FROM_RADOR = {
  k21ztar3: "5001@2x.png",
  lt3gp5do: "5001@2x.png",
  w5oazpzp: "outline-interface-search.svg",
  u4te4tx0: "Frame1.svg",
  uz9yxbza: "Frame3.svg",
  /** В макете Радор: chevron у имени и «выход» справа (не шестерёнка и не сетка) */
  ac7lp2lp: "Frame2.svg",
  ujfy3mdv: "Frame4.svg",
  of5s9282: "Frame5.svg",
  "2fiff9mo": "Activity-Icon.svg",
};

const FALLBACK_IN_APP = {
  nbc1yabw: path.join(ROOT, "public", "home-bg.png"),
};

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

async function main() {
  const radorPublic = findFramesRadorPublic();
  if (!radorPublic) {
    console.warn("[sync-tagjs-assets] фреймы/Радор/public не найден — только запасные файлы");
  } else {
    console.log("[sync-tagjs-assets] источник:", radorPublic);
  }

  fs.mkdirSync(OUT, { recursive: true });
  let ok = 0;

  for (const [id, rel] of Object.entries(MAP_FROM_RADOR)) {
    const src = radorPublic ? path.join(radorPublic, rel) : null;
    const ext = path.extname(rel);
    const dest = path.join(OUT, `${id}${ext}`);
    if (src && fs.existsSync(src)) {
      copyFile(src, dest);
      console.log(`  ${id} <- ${rel}`);
      ok++;
    } else {
      console.warn(`  skip ${id}: нет ${rel}`);
    }
  }

  for (const [id, src] of Object.entries(FALLBACK_IN_APP)) {
    const ext = path.extname(src);
    const dest = path.join(OUT, `${id}${ext}`);
    if (fs.existsSync(src)) {
      copyFile(src, dest);
      console.log(`  ${id} <- fallback ${path.basename(src)}`);
      ok++;
    }
  }

  const { runExtractPage3RoleIcons } = require("./extract-page3-role-icons.cjs");
  await runExtractPage3RoleIcons();

  console.log(`[sync-tagjs-assets] готово: ${ok} файлов кабинета в public/tagjs/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
