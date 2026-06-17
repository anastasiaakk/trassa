/**
 * Кадрирует иллюстрацию подрядчика как у студента (467×700, тот же масштаб и отступы).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const ASSETS = path.join(ROOT, "src", "assets");
const REF = path.join(ASSETS, "cabinet-hero-student.png");
const SRC = path.join(ASSETS, "page3-expanded-role3.png");
const OUT = path.join(ASSETS, "cabinet-hero-contractor.png");
const PUB = path.join(ROOT, "public", "cabinet-hero-contractor.png");

const py = `
from PIL import Image
import numpy as np

W, H = 467, 700

def content_bbox(im):
    a = np.array(im.convert("L"))
    mask = a < 245
    if not mask.any():
        return 0, 0, im.size[0], im.size[1]
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1

ref = Image.open(r"${REF.replace(/\\/g, "\\\\")}")
rx0, ry0, rx1, ry1 = content_bbox(ref)
target_h = ry1 - ry0
bg = ref.getpixel((W // 2, 8))
if isinstance(bg, int):
    bg = (bg, bg, bg)
else:
    bg = bg[:3]

src = Image.open(r"${SRC.replace(/\\/g, "\\\\")}").convert("RGBA")
sx0, sy0, sx1, sy1 = content_bbox(src)
art = src.crop((sx0, sy0, sx1, sy1))
# Как у студента: иллюстрация на всю ширину 467px, низ по той же линии.
scale = W / art.width
nw = W
nh = max(1, int(round(art.height * scale)))
art = art.resize((nw, nh), Image.Resampling.LANCZOS)
y = ry1 - nh
if y < ry0:
    crop = ry0 - y
    art = art.crop((0, crop, nw, nh))
    y = ry0
    nh = art.height

canvas = Image.new("RGB", (W, H), bg)
canvas.paste(art, (0, y), art)
out = r"${OUT.replace(/\\/g, "\\\\")}"
canvas.save(out, quality=92)
print("saved", out, "content y", y, "h", nh)
`;

const pyPath = path.join(ROOT, "scripts", "_align-contractor-hero.py");
fs.writeFileSync(pyPath, py, "utf8");
const r = spawnSync("python", [pyPath], { encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stdout || r.stderr);
  process.exit(1);
}
process.stdout.write(r.stdout || "");
fs.copyFileSync(OUT, PUB);
try {
  fs.unlinkSync(pyPath);
} catch {
  /* ignore */
}
console.log("[align-contractor-hero] public copy ok");
