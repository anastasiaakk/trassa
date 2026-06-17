"""Shared SSH connect helper for deploy scripts."""
from __future__ import annotations

import os
import time
from pathlib import Path

import paramiko

DEFAULT_HOST = "194.226.166.10"
DEFAULT_USER = "root"
MAX_ATTEMPTS = int(os.environ.get("TRASSA_SSH_ATTEMPTS", "4"))
CONNECT_TIMEOUT = int(os.environ.get("TRASSA_SSH_TIMEOUT", "90"))
RETRY_DELAY_SEC = int(os.environ.get("TRASSA_SSH_RETRY_DELAY", "8"))

_SCRIPTS_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _SCRIPTS_DIR.parent


def _load_deploy_local_env() -> None:
    """Опционально: my-react-app/.trassa-deploy.local (не в git)."""
    for path in (_ROOT_DIR / ".trassa-deploy.local", _SCRIPTS_DIR / ".trassa-deploy.local"):
        if not path.is_file():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        break


_load_deploy_local_env()


def connect_trassa_ssh() -> paramiko.SSHClient:
    host = os.environ.get("TRASSA_SSH_HOST", DEFAULT_HOST).strip()
    user = os.environ.get("TRASSA_SSH_USER", DEFAULT_USER).strip()
    password = os.environ.get("TRASSA_SSH_PASSWORD", "").strip()
    if not password:
        raise RuntimeError("Set TRASSA_SSH_PASSWORD")

    last_err: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            print(f"Connecting {user}@{host} (attempt {attempt}/{MAX_ATTEMPTS})...")
            ssh.connect(
                host,
                username=user,
                password=password,
                timeout=CONNECT_TIMEOUT,
                banner_timeout=CONNECT_TIMEOUT,
                auth_timeout=CONNECT_TIMEOUT,
                allow_agent=False,
                look_for_keys=False,
            )
            return ssh
        except Exception as e:
            last_err = e
            print(f"  SSH failed: {e}")
            try:
                ssh.close()
            except Exception:
                pass
            if attempt < MAX_ATTEMPTS:
                time.sleep(RETRY_DELAY_SEC)

    raise RuntimeError(f"SSH unavailable after {MAX_ATTEMPTS} attempts: {last_err}")
