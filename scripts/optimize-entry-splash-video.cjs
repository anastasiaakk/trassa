#!/usr/bin/env node
/**
 * Сжимает public/entry-splash-bg.mp4 для плавного воспроизведения в браузере.
 * Usage: node scripts/optimize-entry-splash-video.cjs [input.mp4]
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let ffmpegPath;
try {
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
} catch {
  console.error("Install: npm install @ffmpeg-installer/ffmpeg --save-dev");
  process.exit(1);
}

const ROOT = path.join(__dirname, "..");
const DURATION_SEC = Number(process.env.ENTRY_SPLASH_DURATION_SEC || "4");
/** Десктоп fullscreen: 1280px; CRF 22 — ~1.5–3 MB за 4 с */
const FPS = Number(process.env.ENTRY_SPLASH_FPS || "30");
const MAX_WIDTH = Number(process.env.ENTRY_SPLASH_MAX_WIDTH || "1280");
const CRF = String(process.env.ENTRY_SPLASH_CRF || "22");
const INPUT =
  process.argv[2] ||
  (fs.existsSync(path.join(ROOT, "public", "entry-splash-bg.unoptimized.mp4"))
    ? path.join(ROOT, "public", "entry-splash-bg.unoptimized.mp4")
    : path.join(ROOT, "public", "entry-splash-bg.mp4"));
const TMP_MP4 = path.join(ROOT, "public", "entry-splash-bg.optimized.mp4");
const TMP_WEBM = path.join(ROOT, "public", "entry-splash-bg.optimized.webm");
const OUT_MP4 = path.join(ROOT, "public", "entry-splash-bg.mp4");
const OUT_WEBM = path.join(ROOT, "public", "entry-splash-bg.webm");

if (!fs.existsSync(INPUT)) {
  console.error("Input not found:", INPUT);
  process.exit(1);
}

const before = fs.statSync(INPUT).size;
console.log(`Input: ${INPUT} (${(before / 1024 / 1024).toFixed(1)} MB)`);

console.log(`Duration: ${DURATION_SEC}s, ${FPS} fps, max width ${MAX_WIDTH}px, CRF ${CRF}`);

const vf = `fps=${FPS},scale='min(${MAX_WIDTH},iw)':-2:flags=lanczos`;

function runFfmpeg(args, label) {
  const r = spawnSync(ffmpegPath, args, { stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`${label} failed`);
    process.exit(r.status || 1);
  }
}

runFfmpeg(
  [
    "-y",
    "-i",
    INPUT,
    "-t",
    String(DURATION_SEC),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-profile:v",
    "high",
    "-level",
    "4.1",
    "-crf",
    CRF,
    "-r",
    String(FPS),
    "-vf",
    vf,
    "-movflags",
    "+faststart",
    "-pix_fmt",
    "yuv420p",
    "-x264-params",
    `keyint=${FPS}:min-keyint=${FPS}:scenecut=0`,
    TMP_MP4,
  ],
  "H.264",
);

/* WebM не используем в плеере — только MP4 (меньше сюрпризов с качеством). */
if (fs.existsSync(OUT_WEBM)) {
  fs.unlinkSync(OUT_WEBM);
}

const afterMp4 = fs.statSync(TMP_MP4).size;
const backup = path.join(ROOT, "public", "entry-splash-bg.unoptimized.mp4");
if (!fs.existsSync(backup)) {
  fs.copyFileSync(INPUT, backup);
  console.log("Backup:", backup);
}
fs.copyFileSync(TMP_MP4, OUT_MP4);
fs.unlinkSync(TMP_MP4);

const POSTER = path.join(ROOT, "public", "entry-splash-poster.jpg");
runFfmpeg(
  ["-y", "-i", OUT_MP4, "-vframes", "1", "-q:v", "2", POSTER],
  "poster",
);
console.log(`Poster: ${POSTER}`);
console.log(`Done: ${OUT_MP4} (${(afterMp4 / 1024 / 1024).toFixed(1)} MB, −${Math.round((1 - afterMp4 / before) * 100)}%)`);
