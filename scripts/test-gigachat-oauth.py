#!/usr/bin/env python3
"""Debug GigaChat OAuth on VPS."""
from __future__ import annotations

import sys
import uuid

from trassa_ssh import connect_trassa_ssh

SCOPES = ["GIGACHAT_API_PERS", "GIGACHAT_API_B2B", "GIGACHAT_API_CORP"]


def main() -> int:
    ssh = connect_trassa_ssh()
    for scope in SCOPES:
        ruid = str(uuid.uuid4())
        cmd = f"""
set -a; source /root/trassa-server/.env 2>/dev/null; set +a
curl -s -k -X POST 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -H 'Accept: application/json' \\
  -H 'RqUID: {ruid}' \\
  -H "Authorization: Basic $GIGACHAT_AUTH_KEY" \\
  --data-urlencode 'scope={scope}' \\
  -w '\\nHTTP:%{{http_code}}'
"""
        _, stdout, _ = ssh.exec_command(cmd, timeout=45)
        stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        print(f"=== {scope} ===")
        print(out[:400])
        print()
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
