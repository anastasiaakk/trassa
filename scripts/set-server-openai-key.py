#!/usr/bin/env python3
"""OPENAI_API_KEY и OPENAI_HTTPS_PROXY в .env на VPS (остальные переменные не трогаем)."""
from __future__ import annotations

import os
import re
import sys

from trassa_ssh import connect_trassa_ssh

REMOTE_ENV = "/root/trassa-server/.env"
KEY_LINE = "OPENAI_API_KEY"
MODEL_LINE = "OPENAI_MODEL=gpt-4o-mini"
PROXY_LINE = "OPENAI_HTTPS_PROXY"


def _upsert_env_line(lines: list[str], prefix: str, new_line: str) -> tuple[list[str], bool]:
    out: list[str] = []
    seen = False
    pat = re.compile(rf"^{re.escape(prefix)}=")
    for line in lines:
        if pat.match(line):
            out.append(new_line)
            seen = True
        else:
            out.append(line)
    return out, seen


def main() -> int:
    api_key = os.environ.get("TRASSA_OPENAI_API_KEY", "").strip() or os.environ.get(
        "OPENAI_API_KEY", ""
    ).strip()
    proxy = os.environ.get("TRASSA_OPENAI_HTTPS_PROXY", "").strip() or os.environ.get(
        "OPENAI_HTTPS_PROXY", ""
    ).strip()

    if not api_key and not proxy:
        print(
            "Set TRASSA_OPENAI_API_KEY and/or TRASSA_OPENAI_HTTPS_PROXY, then rerun.",
            file=sys.stderr,
        )
        return 1
    if api_key and not api_key.startswith("sk-"):
        print("Key should start with sk-", file=sys.stderr)
        return 1

    ssh = connect_trassa_ssh()
    sftp = ssh.open_sftp()
    try:
        with sftp.open(REMOTE_ENV, "r") as f:
            text = f.read().decode("utf-8", errors="replace")
    except OSError:
        text = ""

    lines = text.splitlines()
    out = lines

    if api_key:
        out, seen_key = _upsert_env_line(out, KEY_LINE, f"{KEY_LINE}={api_key}")
        if not seen_key:
            if out and out[-1].strip():
                out.append("")
            out.append(f"{KEY_LINE}={api_key}")

    out, seen_model = _upsert_env_line(out, "OPENAI_MODEL", MODEL_LINE)
    if not seen_model:
        out.append(MODEL_LINE)

    if proxy:
        out, seen_proxy = _upsert_env_line(out, PROXY_LINE, f"{PROXY_LINE}={proxy}")
        if not seen_proxy:
            out.append(f"{PROXY_LINE}={proxy}")

    new_text = "\n".join(out).rstrip() + "\n"
    with sftp.open(REMOTE_ENV, "w") as f:
        f.write(new_text.encode("utf-8"))
    sftp.close()

    _, stdout, stderr = ssh.exec_command("systemctl restart trassa-api && sleep 2")
    code = stdout.channel.recv_exit_status()
    if code != 0:
        print(stderr.read().decode(), file=sys.stderr)
        ssh.close()
        return 1

    _, stdout, _ = ssh.exec_command("curl -sf http://127.0.0.1:4000/api/tbot/status")
    status = stdout.read().decode().strip()
    print(f"Updated {REMOTE_ENV}, restarted trassa-api.")
    print(f"tbot/status: {status}")
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
