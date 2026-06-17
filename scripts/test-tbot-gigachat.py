#!/usr/bin/env python3
"""Quick smoke test: /api/tbot/chat on VPS."""
from __future__ import annotations

import json
import sys

from trassa_ssh import connect_trassa_ssh

PAYLOAD = json.dumps(
    {"messages": [{"role": "user", "content": "Ответь одним словом: работает?"}]},
    ensure_ascii=False,
)


def main() -> int:
    ssh = connect_trassa_ssh()
    cmd = (
        "curl -s -X POST http://127.0.0.1:4000/api/tbot/chat "
        "-H 'Content-Type: application/json' "
        f"-d {json.dumps(PAYLOAD)} -w '\\nHTTP:%{{http_code}}'"
    )
    _, stdout, stderr = ssh.exec_command(cmd, timeout=90)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(f"exit {code}")
    print(out[:800])
    if err.strip():
        print(err[:400], file=sys.stderr)
    ssh.close()
    return 0 if code == 0 and '"ok":true' in out.replace(" ", "") else 1


if __name__ == "__main__":
    raise SystemExit(main())
