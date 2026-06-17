#!/usr/bin/env python3
"""GigaChat (бесплатный API Сбера) в .env на VPS — работает из России без прокси."""
from __future__ import annotations

import os
import re
import sys

from trassa_ssh import connect_trassa_ssh

REMOTE_ENV = "/root/trassa-server/.env"
AUTH_LINE = "GIGACHAT_AUTH_KEY"
PROVIDER_LINE = "AI_PROVIDER=gigachat"
MODEL_LINE = "GIGACHAT_MODEL=GigaChat-2-Pro"
SCOPE_LINE = "GIGACHAT_SCOPE=GIGACHAT_API_B2B"
TLS_LINE = "GIGACHAT_TLS_INSECURE=1"


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


def _append_if_missing(lines: list[str], prefix: str, new_line: str) -> list[str]:
    out, seen = _upsert_env_line(lines, prefix, new_line)
    if not seen:
        if out and out[-1].strip():
            out.append("")
        out.append(new_line)
    return out


def main() -> int:
    auth_key = os.environ.get("TRASSA_GIGACHAT_AUTH_KEY", "").strip() or os.environ.get(
        "GIGACHAT_AUTH_KEY", ""
    ).strip()
    model = os.environ.get("TRASSA_GIGACHAT_MODEL", "").strip() or os.environ.get(
        "GIGACHAT_MODEL", "GigaChat-2-Pro"
    ).strip()

    if not auth_key:
        print(
            "Set TRASSA_GIGACHAT_AUTH_KEY (Authorization Key с developers.sber.ru), then rerun.",
            file=sys.stderr,
        )
        return 1

    ssh = connect_trassa_ssh()
    sftp = ssh.open_sftp()
    try:
        with sftp.open(REMOTE_ENV, "r") as f:
            text = f.read().decode("utf-8", errors="replace")
    except OSError:
        text = ""

    lines = text.splitlines()
    out = _append_if_missing(lines, "AI_PROVIDER", PROVIDER_LINE)
    out = _append_if_missing(out, AUTH_LINE, f"{AUTH_LINE}={auth_key}")
    out = _append_if_missing(out, "GIGACHAT_MODEL", f"GIGACHAT_MODEL={model}")
    out = _append_if_missing(out, "GIGACHAT_SCOPE", SCOPE_LINE)
    out = _append_if_missing(out, "GIGACHAT_TLS_INSECURE", TLS_LINE)

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
