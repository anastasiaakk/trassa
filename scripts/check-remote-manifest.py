#!/usr/bin/env python3
import json
import os
import sys
import tempfile

import paramiko

pw = os.environ.get("TRASSA_SSH_PASSWORD", "")
if not pw:
    print("Set TRASSA_SSH_PASSWORD", file=sys.stderr)
    sys.exit(1)

REMOTE = """\
import json, sqlite3
from pathlib import Path

paths = [
    "/var/lib/trassa/api-data/app.db",
    "/root/trassa-server/data/app.db",
]
for p in paths:
    db = Path(p)
    if not db.exists():
        print("missing", p)
        continue
    con = sqlite3.connect(db)
    row = con.execute(
        "SELECT value_json, updated_at FROM portal_kv WHERE key='app_update'"
    ).fetchone()
    print("---", p)
    print(row if row else "no app_update row")
"""

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("194.226.166.10", username="root", password=pw, timeout=30)

with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as f:
    f.write(REMOTE)
    local = f.name

sftp = ssh.open_sftp()
sftp.put(local, "/tmp/check-manifest.py")
sftp.close()
os.unlink(local)

_, stdout, stderr = ssh.exec_command("python3 /tmp/check-manifest.py")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print(err, file=sys.stderr)

_, stdout, _ = ssh.exec_command("curl -sf http://127.0.0.1:4000/api/app-update/current")
print("live API:", stdout.read().decode())
ssh.close()
