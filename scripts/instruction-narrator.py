#!/usr/bin/env python3
"""
Синтез речи (Edge TTS) и наложение диктора на видео-инструкцию.
Usage: python scripts/instruction-narrator.py <cues.json> <video.mp4> [output.mp4]
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE = os.environ.get("INSTRUCTION_TTS_VOICE", "ru-RU-DmitryNeural")
RATE = os.environ.get("INSTRUCTION_TTS_RATE", "+4%")
PITCH = os.environ.get("INSTRUCTION_TTS_PITCH", "+0Hz")
MIN_SLOT_SEC = 0.35
GAP_BEFORE_NEXT_SEC = 0.18


def ensure_edge_tts():
    try:
        import edge_tts  # noqa: F401

        return
    except ImportError:
        print("Installing edge-tts…", flush=True)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts", "-q"])
        import edge_tts  # noqa: F401


def ffmpeg_path() -> str:
    root = Path(__file__).resolve().parent.parent
    try:
        import importlib.util

        spec = importlib.util.find_spec("ffmpeg_installer")
        if spec:
            from importlib import import_module

            return import_module("ffmpeg_installer.ffmpeg").path
    except Exception:
        pass
    local = root / "node_modules" / "@ffmpeg-installer" / "win32-x64" / "ffmpeg.exe"
    if local.is_file():
        return str(local)
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise RuntimeError("ffmpeg not found")


def media_duration(ffmpeg: str, path: str) -> float:
    try:
        proc = subprocess.run([ffmpeg, "-i", path], capture_output=True, text=True, check=False)
        stream = (proc.stderr or "") + (proc.stdout or "")
        m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", stream)
        if m:
            return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    except Exception:
        pass
    return 0.0


def ffprobe_duration(path: str) -> float:
    return media_duration(ffmpeg_path(), path)


def probe_audio_duration(ffmpeg: str, path: str) -> float:
    dur = media_duration(ffmpeg, path)
    return max(0.01, dur) if dur > 0 else 1.0


async def synth_clip(text: str, out_mp3: str) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text.strip(), VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(out_mp3)


def build_atempo_chain(factor: float) -> str:
    """atempo only supports 0.5–2.0 per filter."""
    if factor <= 1.001:
        return ""
    parts: list[str] = []
    remaining = factor
    while remaining > 2.001:
        parts.append("atempo=2.0")
        remaining /= 2.0
    if remaining > 1.001:
        parts.append(f"atempo={remaining:.4f}")
    return ",".join(parts)


async def generate_clips(cues: list[dict], tmp: Path, ffmpeg: str, video_dur: float) -> list[dict]:
    clips: list[dict] = []
    for i, cue in enumerate(cues):
        text = (cue.get("text") or "").strip()
        if not text:
            continue
        start = max(0.0, float(cue.get("startSec", 0)))
        if i + 1 < len(cues):
            slot = float(cues[i + 1].get("startSec", start)) - start - GAP_BEFORE_NEXT_SEC
        else:
            slot = max(MIN_SLOT_SEC, video_dur - start - 0.25)
        slot = max(MIN_SLOT_SEC, slot)

        mp3 = tmp / f"clip_{i:03d}.mp3"
        await synth_clip(text, str(mp3))
        dur = probe_audio_duration(ffmpeg, str(mp3))
        tempo = 1.0
        if dur > slot:
            tempo = min(1.85, dur / slot)
        clips.append({"startSec": start, "file": str(mp3), "duration": dur, "tempo": tempo, "text": text})
        print(f"  [{i + 1}/{len(cues)}] {start:6.1f}s  tempo x{tempo:.2f}  {text[:72]}", flush=True)
    return clips


def mux_video(ffmpeg: str, video: str, clips: list[dict], output: str) -> None:
    if not clips:
        shutil.copy2(video, output)
        return

    filter_parts: list[str] = []
    inputs = ["-y", "-i", video]
    labels: list[str] = []

    for i, clip in enumerate(clips):
        inputs.extend(["-i", clip["file"]])
        delay_ms = int(clip["startSec"] * 1000)
        chain = f"adelay={delay_ms}|{delay_ms}"
        tempo_chain = build_atempo_chain(clip["tempo"])
        if tempo_chain:
            chain = f"{tempo_chain},{chain}"
        chain = f"aresample=48000,aformat=channel_layouts=stereo,{chain}"
        label = f"na{i}"
        filter_parts.append(f"[{i + 1}:a]{chain},volume=1.0[{label}]")
        labels.append(f"[{label}]")

    filter_parts.append(
        f"{''.join(labels)}amix=inputs={len(labels)}:duration=longest:dropout_transition=2[outa]"
    )
    filter_complex = ";".join(filter_parts)

    cmd = [
        ffmpeg,
        *inputs,
        "-filter_complex",
        filter_complex,
        "-map",
        "0:v:0",
        "-map",
        "[outa]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        "-shortest",
        output,
    ]
    print("Muxing audio…", flush=True)
    subprocess.check_call(cmd)


async def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: instruction-narrator.py <cues.json> <video.mp4> [output.mp4]", file=sys.stderr)
        return 1

    cues_path = Path(sys.argv[1])
    video_path = Path(sys.argv[2])
    output_path = Path(sys.argv[3] if len(sys.argv) > 3 else video_path)

    if not cues_path.is_file():
        print(f"Cues not found: {cues_path}", file=sys.stderr)
        return 1
    if not video_path.is_file():
        print(f"Video not found: {video_path}", file=sys.stderr)
        return 1

    ensure_edge_tts()
    ffmpeg = ffmpeg_path()

    with cues_path.open(encoding="utf-8") as f:
        cues = json.load(f)
    if not isinstance(cues, list) or not cues:
        print("Empty cues list", file=sys.stderr)
        return 1

    video_dur = ffprobe_duration(str(video_path))
    print(f"Voice: {VOICE}  Video: {video_dur:.1f}s  Cues: {len(cues)}", flush=True)

    tmp = Path(tempfile.mkdtemp(prefix="trassa-narrator-"))
    try:
        clips = await generate_clips(cues, tmp, ffmpeg, video_dur)
        out_tmp = tmp / "muxed.mp4"
        mux_video(ffmpeg, str(video_path), clips, str(out_tmp))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_tmp, output_path)
        print(f"OK Narrated video: {output_path}", flush=True)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
