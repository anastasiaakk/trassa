#!/usr/bin/env python3
"""Fast T-bot model settings on VPS."""
from __future__ import annotations

import re
import sys

from trassa_ssh import connect_trassa_ssh

REMOTE_ENV = "/root/trassa-server/.env"
LINES = {
    "OPENROUTER_TBOT_MODEL": "OPENROUTER_TBOT_MODEL=meta-llama/llama-3.3-70b-instruct:free",
    "TBOT_AI_MAX_TOKENS": "TBOT_AI_MAX_TOKENS=512",
}


def _upsert(lines: list[str], prefix: str, new_line: str) -> list[str]:
    pat = re.compile(rf"^{re.escape(prefix)}=")
    out: list[str] = []
    seen = False
    for line in lines:
        if pat.match(line):
            out.append(new_line)
            seen = True
        else:
            out.append(line)
    if not seen:
        out.append(new_line)
    return out


def main() -> int:
    ssh = connect_trassa_ssh()
    sftp = ssh.open_sftp()
    try:
        text = sftp.open(REMOTE_ENV, "r").read().decode("utf-8", errors="replace")
    except OSError:
        text = ""
    out = text.splitlines()
    for prefix, line in LINES.items():
        out = _upsert(out, prefix, line)
    sftp.open(REMOTE_ENV, "w").write(("\n".join(out).rstrip() + "\n").encode("utf-8"))
    sftp.close()
    _, stdout, _ = ssh.exec_command("systemctl restart trassa-api && sleep 2", timeout=30)
    stdout.channel.recv_exit_status()
    _, stdout, _ = ssh.exec_command("curl -sf http://127.0.0.1:4000/api/tbot/status", timeout=15)
    print(stdout.read().decode("utf-8", errors="replace"))
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
