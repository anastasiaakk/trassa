#!/usr/bin/env python3
"""Set GIGACHAT_SCOPE on VPS."""
from __future__ import annotations

import re
import sys

from trassa_ssh import connect_trassa_ssh

REMOTE_ENV = "/root/trassa-server/.env"
SCOPE = sys.argv[1] if len(sys.argv) > 1 else "GIGACHAT_API_B2B"


def main() -> int:
    ssh = connect_trassa_ssh()
    sftp = ssh.open_sftp()
    try:
        text = sftp.open(REMOTE_ENV, "r").read().decode("utf-8", errors="replace")
    except OSError:
        text = ""
    pat = re.compile(r"^GIGACHAT_SCOPE=")
    lines = text.splitlines()
    out: list[str] = []
    seen = False
    for line in lines:
        if pat.match(line):
            out.append(f"GIGACHAT_SCOPE={SCOPE}")
            seen = True
        else:
            out.append(line)
    if not seen:
        out.append(f"GIGACHAT_SCOPE={SCOPE}")
    sftp.open(REMOTE_ENV, "w").write(("\n".join(out).rstrip() + "\n").encode("utf-8"))
    sftp.close()
    _, stdout, _ = ssh.exec_command("systemctl restart trassa-api && sleep 2", timeout=30)
    stdout.channel.recv_exit_status()
    _, stdout, _ = ssh.exec_command("curl -sf http://127.0.0.1:4000/api/tbot/status", timeout=15)
    stdout.channel.recv_exit_status()
    print(stdout.read().decode("utf-8", errors="replace"))
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
