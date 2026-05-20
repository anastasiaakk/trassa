#!/usr/bin/env python3
"""Обновить только API на VPS (без переустановки nginx/certbot, JWT сохраняется)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"
REMOTE_DIR = "/root/trassa-server"
HOST = os.environ.get("TRASSA_SSH_HOST", "194.226.166.10").strip()
USER = os.environ.get("TRASSA_SSH_USER", "root").strip()
PASSWORD = os.environ.get("TRASSA_SSH_PASSWORD", "").strip()
DOMAIN = os.environ.get("TRASSA_API_DOMAIN", "trassa-api.duckdns.org").strip()
SKIP = {"node_modules", ".git", "data"}


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 600) -> None:
    print(f"\n$ {cmd[:140]}{'...' if len(cmd) > 140 else ''}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out[-3000:] if len(out) > 3000 else out)
    if code != 0:
        if err.strip():
            print(err[-1500:], file=sys.stderr)
        raise RuntimeError(f"exit {code}: {cmd}")


def upload_tree(sftp: paramiko.SFTPClient, local: Path, remote: str) -> None:
    for item in local.iterdir():
        if item.name in SKIP:
            continue
        rpath = f"{remote}/{item.name}"
        if item.is_dir():
            try:
                sftp.mkdir(rpath)
            except OSError:
                pass
            upload_tree(sftp, item, rpath)
        else:
            print(f"  upload {item.relative_to(ROOT)}")
            sftp.put(str(item), rpath)


def main() -> int:
    if not PASSWORD:
        print("Set TRASSA_SSH_PASSWORD", file=sys.stderr)
        return 1
    if not SERVER_DIR.is_dir():
        print(f"Missing {SERVER_DIR}", file=sys.stderr)
        return 1

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting {USER}@{HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)

    run(ssh, f"mkdir -p {REMOTE_DIR}")
    sftp = ssh.open_sftp()
    upload_tree(sftp, SERVER_DIR, REMOTE_DIR)
    sftp.close()

    run(ssh, f"cd {REMOTE_DIR} && npm ci && npm run build", timeout=900)
    run(ssh, "systemctl restart trassa-api")
    run(ssh, "sleep 2 && curl -sf http://127.0.0.1:4000/api/health")
    run(ssh, f"curl -sf https://{DOMAIN}/api/health")
    try:
        run(ssh, f"curl -sf https://{DOMAIN}/api/portal/version")
    except RuntimeError:
        print("WARN: /api/portal/version not available yet", file=sys.stderr)

    print("\n=== API updated ===")
    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
