#!/usr/bin/env python3
"""DeepSeek API key on VPS — проще GigaChat, работает из России."""
from __future__ import annotations

import os
import re
import sys

from trassa_ssh import connect_trassa_ssh

REMOTE_ENV = "/root/trassa-server/.env"
KEY_LINE = "DEEPSEEK_API_KEY"
PROVIDER_LINE = "AI_PROVIDER=deepseek"
MODEL_LINE = "DEEPSEEK_MODEL=deepseek-chat"


def _append_if_missing(lines: list[str], prefix: str, new_line: str) -> list[str]:
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
        if out and out[-1].strip():
            out.append("")
        out.append(new_line)
    return out


def main() -> int:
    api_key = os.environ.get("TRASSA_DEEPSEEK_API_KEY", "").strip() or os.environ.get(
        "DEEPSEEK_API_KEY", ""
    ).strip()
    if not api_key:
        print("Set TRASSA_DEEPSEEK_API_KEY, then rerun.", file=sys.stderr)
        return 1

    ssh = connect_trassa_ssh()
    sftp = ssh.open_sftp()
    try:
        text = sftp.open(REMOTE_ENV, "r").read().decode("utf-8", errors="replace")
    except OSError:
        text = ""
    lines = text.splitlines()
    out = _append_if_missing(lines, "AI_PROVIDER", PROVIDER_LINE)
    out = _append_if_missing(out, KEY_LINE, f"{KEY_LINE}={api_key}")
    out = _append_if_missing(out, "DEEPSEEK_MODEL", MODEL_LINE)
    sftp.open(REMOTE_ENV, "w").write(("\n".join(out).rstrip() + "\n").encode("utf-8"))
    sftp.close()
    _, stdout, stderr = ssh.exec_command("systemctl restart trassa-api && sleep 2")
    if stdout.channel.recv_exit_status() != 0:
        print(stderr.read().decode(), file=sys.stderr)
        return 1
    _, stdout, _ = ssh.exec_command("curl -sf http://127.0.0.1:4000/api/tbot/status")
    print(stdout.read().decode().strip())
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
