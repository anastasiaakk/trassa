#!/usr/bin/env python3
"""One-shot deploy Trassa API to REG.cloud VPS. Usage:
  set TRASSA_SSH_PASSWORD=...
  python scripts/remote-deploy-reg.py
"""
from __future__ import annotations

import json
import os
import secrets
import sys
import time
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT / "server"
REMOTE_DIR = "/root/trassa-server"
DOMAIN = os.environ.get("TRASSA_API_DOMAIN", "trassa-api.duckdns.org").strip()
HOST = os.environ.get("TRASSA_SSH_HOST", "194.226.166.10").strip()
USER = os.environ.get("TRASSA_SSH_USER", "root").strip()
PASSWORD = os.environ.get("TRASSA_SSH_PASSWORD", "").strip()

SKIP = {"node_modules", ".git", "data"}


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str, str]:
    print(f"\n$ {cmd[:120]}{'...' if len(cmd) > 120 else ''}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    def _p(text: str) -> None:
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        safe = text.encode(enc, errors="replace").decode(enc, errors="replace")
        print(safe)

    if out.strip():
        _p(out[-4000:] if len(out) > 4000 else out)
    if err.strip() and code != 0:
        _p(err[-2000:])
    if code != 0:
        raise RuntimeError(f"Command failed ({code}): {cmd}\n{err}")
    return code, out, err


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


def main() -> None:
    if not PASSWORD:
        print("Set TRASSA_SSH_PASSWORD", file=sys.stderr)
        sys.exit(1)
    if not SERVER_DIR.is_dir():
        print(f"Missing {SERVER_DIR}", file=sys.stderr)
        sys.exit(1)

    jwt = secrets.token_hex(32)
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}...")
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30, allow_agent=False, look_for_keys=False)

    run(
        ssh,
        "export DEBIAN_FRONTEND=noninteractive; "
        "apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx git curl ca-certificates",
    )
    run(
        ssh,
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && "
        "apt-get install -y -qq nodejs",
        timeout=900,
    )
    run(ssh, "node -v && npm -v")

    run(ssh, f"rm -rf {REMOTE_DIR} && mkdir -p {REMOTE_DIR}")
    sftp = ssh.open_sftp()
    upload_tree(sftp, SERVER_DIR, REMOTE_DIR)
    sftp.close()

    run(ssh, f"cd {REMOTE_DIR} && npm ci && npm run build", timeout=900)

    api_env = f"""NODE_ENV=production
JWT_SECRET={jwt}
PORT=4000
LISTEN_HOST=127.0.0.1
TRUST_PROXY=1
TRASSA_DATA_DIR=/var/lib/trassa/api-data
CORS_ORIGIN=http://localhost:5173
"""
    run(ssh, "mkdir -p /var/lib/trassa/api-data /etc/trassa")
    run(ssh, f"cat > /etc/trassa/api.env << 'EOF'\n{api_env}EOF")

    unit = f"""[Unit]
Description=Trassa API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={REMOTE_DIR}
EnvironmentFile=/etc/trassa/api.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
"""
    run(ssh, f"cat > /etc/systemd/system/trassa-api.service << 'EOF'\n{unit}EOF")
    run(ssh, "systemctl daemon-reload && systemctl enable --now trassa-api")
    time.sleep(2)
    run(ssh, "curl -sf http://127.0.0.1:4000/api/health")

    nginx = f"""server {{
    listen 80;
    server_name {DOMAIN};

    location /api/ {{
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
    }}
}}
"""
    run(ssh, f"cat > /etc/nginx/sites-available/trassa-api << 'EOF'\n{nginx}EOF")
    run(ssh, "ln -sf /etc/nginx/sites-available/trassa-api /etc/nginx/sites-enabled/trassa-api")
    run(ssh, "rm -f /etc/nginx/sites-enabled/default; nginx -t && systemctl reload nginx")
    run(
        ssh,
        f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos "
        f"--register-unsafely-without-email --redirect",
        timeout=300,
    )
    run(ssh, f"curl -sf https://{DOMAIN}/api/health")

    api_url = f"https://{DOMAIN}"
    release_cfg = ROOT / "release-config.json"
    cfg = json.loads(release_cfg.read_text(encoding="utf-8"))
    cfg["apiUrl"] = api_url
    release_cfg.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")

    electron_api = ROOT / "electron-assets" / "api.json"
    electron_api.write_text(
        json.dumps({"apiUrl": api_url, "useRemoteApi": True}, indent=2) + "\n",
        encoding="utf-8",
    )

    env_local = ROOT / ".env.production.local"
    env_local.write_text(
        "# auto-generated by remote-deploy-reg.py\n"
        "VITE_USE_AUTH_API=true\n"
        f"VITE_API_URL={api_url}\n",
        encoding="utf-8",
    )

    print("\n=== DONE ===")
    print(f"API: {api_url}/api/health")
    print(f"release-config.json apiUrl = {api_url}")
    print("Next on your PC: npm run electron:build")
    ssh.close()


if __name__ == "__main__":
    main()
