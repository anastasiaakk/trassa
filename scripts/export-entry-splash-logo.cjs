/**
 * Готовит entry-splash-logo.png из исходника Group 37066 (PNG с прозрачностью или чёрным фоном).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public", "entry-splash-logo-source.png");
const OUT = path.join(ROOT, "public", "entry-splash-logo.png");

const source = SRC;
if (!fs.existsSync(source)) {
  console.error("[export-entry-splash-logo] source not found:", source);
  process.exit(1);
}

const py = `
from PIL import Image, ImageFilter
import sys

src, dest = sys.argv[1], sys.argv[2]
TARGET_W = 680

im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 24 or (r > 238 and g > 238 and b > 238) or (r < 28 and g < 28 and b < 28):
            px[x, y] = (r, g, b, 0)
            continue
        if a < 200:
            px[x, y] = (r, g, b, min(255, int(a * 1.35)))

bbox = im.getbbox()
if bbox:
    im = im.crop(bbox)

scale = TARGET_W / im.width
nh = max(1, int(round(im.height * scale)))
im = im.resize((TARGET_W, nh), Image.Resampling.LANCZOS)
im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=140, threshold=2))
im.save(dest, format="PNG", optimize=True)
print("ok", dest, im.size)
`;

const pyPath = path.join(ROOT, "scripts", "_export-entry-logo.py");
fs.writeFileSync(pyPath, py, "utf8");
const r = spawnSync("python", [pyPath, source, OUT], { encoding: "utf8" });
if (r.status !== 0) {
  console.error(r.stdout || r.stderr);
  process.exit(1);
}
process.stdout.write(r.stdout || "");
try {
  fs.unlinkSync(pyPath);
} catch {
  /* ignore */
}
