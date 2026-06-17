import json
from pathlib import Path

path = Path(
    r"C:\Users\artem\.cursor\projects\c-Programm\agent-transcripts"
    r"\e13fc9ba-0fe8-455e-b069-a0eb0b374502\e13fc9ba-0fe8-455e-b069-a0eb0b374502.jsonl"
)
out = Path(__file__).resolve().parents[1] / "_recovered-AdminPresentationPanel.tsx"

candidates: list[tuple[int, str]] = []

for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
    if "AdminPresentationPanel.tsx" not in line:
        continue
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        continue
    for part in obj.get("message", {}).get("content", []):
        if part.get("type") != "tool_use" or part.get("name") != "Write":
            continue
        inp = part.get("input", {})
        if "AdminPresentationPanel.tsx" not in inp.get("path", ""):
            continue
        contents = inp.get("contents", "")
        if "tpi__" in contents:
            candidates.append((i, contents))

if not candidates:
    print("No tpi__ versions found")
    raise SystemExit(1)

# Prefer latest version without tps- classes
pure = [c for c in candidates if "tps-" not in c[1]]
chosen = pure[-1] if pure else candidates[-1]
out.write_text(chosen[1], encoding="utf-8")
print(f"Wrote {out} from transcript line {chosen[0]}, len={len(chosen[1])}, tps={'tps-' in chosen[1]}")
