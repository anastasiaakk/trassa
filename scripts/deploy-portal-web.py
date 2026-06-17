#!/usr/bin/env python3
"""Upload dist/ and enable nginx for trassa.duckdns.org (portal + /api proxy).

Prerequisites:
  - npm run build:web  (creates dist/)
  - DuckDNS: trassa.duckdns.org → same VPS IP as trassa-api
  - trassa-api systemd service on :4000

Usage (PowerShell):
  cd c:\\Programm\\my-react-app
  npm run build:web
  npm run deploy:web

  Пароль SSH: my-react-app/.trassa-deploy.local (TRASSA_SSH_PASSWORD=...)
  или $env:TRASSA_SSH_PASSWORD = '...'
"""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

import paramiko
from trassa_ssh import connect_trassa_ssh

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
NGINX_EXAMPLE = ROOT / "deploy" / "nginx-portal-web.example.conf"
TAR_PATH = ROOT / "dist-web.tar.gz"

PORTAL_DOMAIN = os.environ.get("TRASSA_PORTAL_DOMAIN", "trassa.duckdns.org").strip()
REMOTE_DIST = os.environ.get("TRASSA_REMOTE_DIST", "/var/www/trassa/dist").strip()
REMOTE_TAR = "/tmp/trassa-dist-web.tar.gz"
SFTP_RETRIES = int(os.environ.get("TRASSA_SFTP_RETRIES", "3"))


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 600) -> None:
    print(f"\n$ {cmd[:140]}{'...' if len(cmd) > 140 else ''}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    enc = getattr(sys.stdout, "encoding", None) or "utf-8"

    def _p(text: str) -> None:
        safe = text.encode(enc, errors="replace").decode(enc, errors="replace")
        print(safe)

    if out.strip():
        _p(out[-4000:] if len(out) > 4000 else out)
    if err.strip() and code != 0:
        _p(err[-2000:])
    if code != 0:
        raise RuntimeError(f"Command failed ({code}): {cmd}\n{err}")


def build_dist_tar() -> None:
    """Один архив надёжнее сотен SFTP-файлов; exe установщика опционален."""
    include_setup = os.environ.get("TRASSA_WEB_INCLUDE_SETUP", "").strip() in ("1", "true", "yes")
    if TAR_PATH.is_file():
        TAR_PATH.unlink()
    cmd = ["tar", "-czf", str(TAR_PATH), "-C", str(DIST)]
    if not include_setup:
        cmd.insert(1, f"--exclude=downloads/trassa-setup.exe")
    cmd.append(".")
    print(f"\n$ {' '.join(cmd)}")
    subprocess.run(cmd, check=True, cwd=ROOT)
    size_mb = TAR_PATH.stat().st_size / (1024 * 1024)
    print(f"Archive: {TAR_PATH.name} ({size_mb:.1f} MB)")
    if not include_setup:
        print("(trassa-setup.exe skipped — set TRASSA_WEB_INCLUDE_SETUP=1 to include)")


def sftp_put_with_retry(sftp: paramiko.SFTPClient, local: Path, remote: str) -> None:
    last_err: Exception | None = None
    for attempt in range(1, SFTP_RETRIES + 1):
        try:
            print(f"  upload {local.name} -> {remote} (attempt {attempt}/{SFTP_RETRIES})")
            sftp.put(str(local), remote)
            return
        except (EOFError, OSError, paramiko.SSHException) as e:
            last_err = e
            print(f"  upload failed: {e}")
            if attempt < SFTP_RETRIES:
                time.sleep(4 * attempt)
    raise RuntimeError(f"SFTP upload failed after {SFTP_RETRIES} attempts: {last_err}")


def upload_dist_archive(ssh: paramiko.SSHClient) -> None:
    build_dist_tar()
    sftp = ssh.open_sftp()
    try:
        sftp_put_with_retry(sftp, TAR_PATH, REMOTE_TAR)
    finally:
        sftp.close()
    run(ssh, f"mkdir -p {REMOTE_DIST} && rm -rf {REMOTE_DIST}/*")
    run(ssh, f"tar -xzf {REMOTE_TAR} -C {REMOTE_DIST} && rm -f {REMOTE_TAR}")


def main() -> None:
    if not os.environ.get("TRASSA_SSH_PASSWORD", "").strip():
        print("Set TRASSA_SSH_PASSWORD", file=sys.stderr)
        sys.exit(1)
    if not DIST.is_dir():
        print(f"Missing {DIST} — run: npm run build:web", file=sys.stderr)
        sys.exit(1)
    if not NGINX_EXAMPLE.is_file():
        print(f"Missing {NGINX_EXAMPLE}", file=sys.stderr)
        sys.exit(1)

    nginx_body = NGINX_EXAMPLE.read_text(encoding="utf-8")
    if PORTAL_DOMAIN not in nginx_body:
        nginx_body = nginx_body.replace("trassa.duckdns.org", PORTAL_DOMAIN)

    ssh = connect_trassa_ssh()

    upload_dist_archive(ssh)

    run(ssh, f"cat > /etc/nginx/sites-available/trassa-portal << 'EOF'\n{nginx_body}EOF")
    run(ssh, "ln -sf /etc/nginx/sites-available/trassa-portal /etc/nginx/sites-enabled/trassa-portal")
    # Иначе при заходе по IP или чужому Host — «Добро пожаловать в nginx!»
    run(ssh, "rm -f /etc/nginx/sites-enabled/default")

    portal_url = f"https://{PORTAL_DOMAIN}"
    api_domain = os.environ.get("TRASSA_API_DOMAIN", "trassa-api.duckdns.org").strip()
    api_redirect = f"""server {{
    listen 80;
    listen [::]:80;
    server_name {api_domain};

    location = / {{
        return 301 {portal_url}/;
    }}

    location /api/ {{
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20m;
        client_body_timeout 300s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        send_timeout 300s;
    }}
}}
"""
    run(ssh, f"cat > /etc/nginx/sites-available/trassa-api << 'EOF'\n{api_redirect}EOF")
    run(ssh, "ln -sf /etc/nginx/sites-available/trassa-api /etc/nginx/sites-enabled/trassa-api")
    run(ssh, "nginx -t && systemctl reload nginx")

    cors_line = (
        f"CORS_ORIGIN=https://{PORTAL_DOMAIN},http://{PORTAL_DOMAIN},"
        "http://localhost:5173,http://127.0.0.1:5173"
    )
    run(
        ssh,
        f"grep -q '^CORS_ORIGIN=' /etc/trassa/api.env 2>/dev/null && "
        f"sed -i 's|^CORS_ORIGIN=.*|{cors_line}|' /etc/trassa/api.env || "
        f"echo '{cors_line}' >> /etc/trassa/api.env",
    )
    run(
        ssh,
        "grep -q '^TRUST_PROXY=' /etc/trassa/api.env 2>/dev/null && "
        "sed -i 's|^TRUST_PROXY=.*|TRUST_PROXY=1|' /etc/trassa/api.env || "
        "echo 'TRUST_PROXY=1' >> /etc/trassa/api.env",
    )
    run(ssh, "systemctl restart trassa-api")

    run(
        ssh,
        f"certbot --nginx -d {PORTAL_DOMAIN} --non-interactive --agree-tos "
        f"--register-unsafely-without-email --redirect 2>/dev/null || true",
        timeout=300,
    )
    run(ssh, "nginx -t && systemctl reload nginx")

    run(ssh, f"curl -sf {portal_url}/api/health")
    run(ssh, f"curl -sfI {portal_url}/ | head -n 1")

    print("\n=== PORTAL WEB READY ===")
    print(f"Site:  {portal_url}/")
    print(f"QR:    {portal_url}/#/")
    print(f"API:   {portal_url}/api/health")
    ssh.close()


if __name__ == "__main__":
    main()
