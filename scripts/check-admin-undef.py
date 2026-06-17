#!/usr/bin/env python3
"""Find likely-undefined bare identifiers in AdminDashboard component body."""
import re
from pathlib import Path

src = Path(__file__).resolve().parents[1] / "src/pages/AdminDashboard.tsx"
text = src.read_text(encoding="utf-8")

# imports
imports = set()
for m in re.finditer(r"import\s+(?:\{([^}]+)\}|(\w+))", text):
    if m.group(1):
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            name = part.split(" as ")[-1].strip()
            imports.add(name)
    elif m.group(2):
        imports.add(m.group(2))

# top-level decls before component
pre = text.split("export default function AdminDashboard")[0]
decls = set(re.findall(r"(?:function|const|async function)\s+(\w+)", pre))
decls |= imports

# builtins / hooks / common
decls |= {
    "useState", "useEffect", "useMemo", "useCallback", "Fragment", "jsx", "jsxs",
    "FormEvent", "true", "false", "null", "undefined", "String", "Number", "Array",
    "Object", "Math", "JSON", "window", "document", "console", "Error", "Promise",
    "Set", "Map", "Date", "Intl", "parseInt", "parseFloat", "isNaN", "encodeURIComponent",
    "Link", "styles", "glass", "PORTAL_KV", "APP_VERSION", "dr", "SECTION_HEADINGS",
}

body = text.split("export default function AdminDashboard", 1)[1]
# strip strings roughly
body_no_str = re.sub(r"`(?:\\.|[^`])*`", '""', body)
body_no_str = re.sub(r"'(?:\\.|[^'])*'", '""', body_no_str)
body_no_str = re.sub(r'"(?:\\.|[^"])*"', '""', body_no_str)

# calls like Foo( or Foo.bar
calls = set(re.findall(r"\b([A-Za-z_$][\w$]*)\s*\(", body_no_str))
member_calls = set(re.findall(r"\b([A-Za-z_$][\w$]*)\.", body_no_str))

sus = sorted(
    x
    for x in (calls | member_calls)
    if x not in decls and len(x) <= 3 and x[0].islower()
)

print("Short lowercase call/member suspects:", ", ".join(sus[:80]) or "(none)")

# uppercase component-like undefined
calls_upper = sorted(
    x
    for x in calls
    if x not in decls and x[0].isupper() and x not in {"Fragment", "Link"}
)
print("Uppercase call suspects:", ", ".join(calls_upper[:40]) or "(none)")
