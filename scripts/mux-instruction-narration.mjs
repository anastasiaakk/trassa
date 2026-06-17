/**
 * Наложение диктора на готовое видео по cues.json.
 * Usage: node scripts/mux-instruction-narration.mjs [video.mp4] [cues.json]
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildProportionalCues, INSTRUCTION_NARRATION_SCRIPT } from "./instruction-narration-script.mjs";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "videos");

const videoPath = path.resolve(process.argv[2] || path.join(outDir, "mobile-instruction.mp4"));
let cuesPath = path.resolve(process.argv[3] || path.join(outDir, "mobile-instruction.cues.json"));
const pyScript = path.join(__dirname, "instruction-narrator.py");

if (!existsSync(videoPath)) {
  console.error("Video not found:", videoPath);
  process.exit(1);
}

if (!existsSync(cuesPath)) {
  if (process.argv[3]) {
    console.error("Cues not found:", cuesPath);
    process.exit(1);
  }
  let ffmpegPath;
  try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
  } catch {
    ffmpegPath = "ffprobe";
  }
  const probe = spawnSync(ffmpegPath, ["-i", videoPath], { encoding: "utf8" });
  const m = `${probe.stderr || ""}${probe.stdout || ""}`.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const dur = m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 378;
  const cues = buildProportionalCues(INSTRUCTION_NARRATION_SCRIPT, dur, 0, 4);
  cuesPath = path.join(outDir, "mobile-instruction.cues.estimated.json");
  writeFileSync(cuesPath, JSON.stringify(cues, null, 2), "utf8");
  console.log(`Estimated ${cues.length} cues for ${dur.toFixed(1)}s video → ${cuesPath}`);
}

const tmpOut = path.join(outDir, "mobile-instruction-narrated.tmp.mp4");
const finalOut = videoPath;

const r = spawnSync(process.env.PYTHON || "python", [pyScript, cuesPath, videoPath, tmpOut], {
  stdio: "inherit",
  cwd: root,
});

if (r.status !== 0) process.exit(r.status ?? 1);

const backup = path.join(outDir, "mobile-instruction-silent.mp4");
if (finalOut === videoPath && existsSync(finalOut)) {
  try {
    copyFileSync(finalOut, backup);
    renameSync(tmpOut, finalOut);
    console.log(`✓ Saved silent backup: ${backup}`);
  } catch {
    const alt = path.join(outDir, "mobile-instruction-narrated.mp4");
    renameSync(tmpOut, alt);
    console.log(`✓ Narrated copy: ${alt}`);
  }
} else {
  renameSync(tmpOut, finalOut);
}
