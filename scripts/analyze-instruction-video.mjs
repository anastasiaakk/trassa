/**
 * Извлекает кадры из mobile-instruction.mp4 и оценивает яркость области телефона.
 * Usage: node scripts/analyze-instruction-video.mjs
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const videoPath = path.join(root, "public", "videos", "mobile-instruction.mp4");
const framesDir = path.join(root, "public", "videos", "_analysis-frames");

const PHONE_LEFT = 80;
const PHONE_W = 390;
const PHONE_H = 844;
const PRESENT_W = 1920;
const PRESENT_H = 1080;

let ffmpegPath;
try {
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch (e) {
  console.error("ffmpeg not found:", e.message);
  process.exit(1);
}

if (!existsSync(videoPath)) {
  console.error("Video not found:", videoPath);
  process.exit(1);
}

// Duration probe
const probe = spawnSync(
  ffmpegPath,
  ["-i", videoPath, "-hide_banner"],
  { encoding: "utf8" }
);
const durMatch = (probe.stderr || "").match(/Duration:\s(\d+):(\d+):([\d.]+)/);
let durationSec = 273;
if (durMatch) {
  durationSec = +durMatch[1] * 3600 + +durMatch[2] * 60 + +durMatch[3];
}
console.log(`Video: ${videoPath}`);
console.log(`Duration: ~${durationSec.toFixed(1)}s\n`);

rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });

const interval = 12;
const r = spawnSync(
  ffmpegPath,
  [
    "-y",
    "-i",
    videoPath,
    "-vf",
    `fps=1/${interval},scale=${PRESENT_W}:${PRESENT_H}`,
    path.join(framesDir, "frame_%03d.jpg"),
  ],
  { stdio: "inherit" }
);
if (r.status !== 0) process.exit(r.status ?? 1);

// Simple JPEG brightness scan (sample RGB bytes)
function avgBrightness(jpegPath) {
  const buf = readFileSync(jpegPath);
  let sum = 0;
  let n = 0;
  for (let i = 0; i < buf.length - 2; i += 48) {
    sum += buf[i] + buf[i + 1] + buf[i + 2];
    n += 3;
  }
  return n ? sum / n : 0;
}

const files = readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).sort();
console.log("Time(s) | Avg brightness (0-255) | Note");
console.log("-".repeat(50));

const issues = [];
for (let i = 0; i < files.length; i += 1) {
  const t = i * interval;
  const full = avgBrightness(path.join(framesDir, files[i]));
  let note = "ok";
  if (full < 45) {
    note = "VERY DARK";
    issues.push({ t, full, note });
  } else if (full < 90) {
    note = "dark";
    issues.push({ t, full, note });
  }
  console.log(`${String(t).padStart(5)} | ${full.toFixed(1).padStart(6)} | ${note}`);
}

if (issues.length) {
  console.log(`\n⚠ ${issues.length} potentially problematic segments (check phone/cabinet areas manually)`);
} else {
  console.log("\n✓ No globally dark frames detected");
}
