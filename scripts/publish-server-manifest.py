#!/usr/bin/env python3
"""Publish app_update manifest on production VPS (SFTP + remote python)."""
import json
import os
import sys
import tempfile

import paramiko

MANIFEST = {
    "version": "0.2.11",
    "setupUrl": "https://github.com/anastasiaakk/trassa/releases/latest/download/trassa-setup.exe",
    "releaseNotes": "Быстрая синхронизация (3 с), исправления админки и установщика.",
}

REMOTE_SCRIPT = """\
import json, sqlite3, datetime
from pathlib import Path

manifest = json.loads(open("/tmp/trassa-manifest.json", encoding="utf-8").read())
db = Path("/var/lib/trassa/api-data/app.db")
con = sqlite3.connect(db)
now = datetime.datetime.utcnow().isoformat() + "Z"
val = json.dumps(manifest, ensure_ascii=False)
con.execute(
    "INSERT INTO portal_kv (key,value_json,updated_at,updated_by) VALUES (?,?,?,?) "
    "ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, "
    "updated_at=excluded.updated_at, updated_by=excluded.updated_by",
    ("app_update", val, now, "deploy"),
)
con.commit()
print("ok")
"""


def main() -> int:
    pw = os.environ.get("TRASSA_SSH_PASSWORD")
    if not pw:
        print("Set TRASSA_SSH_PASSWORD", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect("194.226.166.10", username="root", password=pw, timeout=30)

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as mf:
        json.dump(MANIFEST, mf, ensure_ascii=False)
        manifest_path = mf.name
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".py", delete=False) as sf:
        sf.write(REMOTE_SCRIPT)
        script_path = sf.name

    try:
        sftp = ssh.open_sftp()
        sftp.put(manifest_path, "/tmp/trassa-manifest.json")
        sftp.put(script_path, "/tmp/trassa-publish-manifest.py")
        sftp.close()
        _, stdout, stderr = ssh.exec_command("python3 /tmp/trassa-publish-manifest.py")
        out = stdout.read().decode()
        err = stderr.read().decode()
        print(out or err)
        return 0 if "ok" in out else 1
    finally:
        ssh.close()
        os.unlink(manifest_path)
        os.unlink(script_path)


if __name__ == "__main__":
    raise SystemExit(main())

