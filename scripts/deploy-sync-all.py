#!/usr/bin/env python3
"""Build web + deploy API + deploy portal (one command)."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run_step(label: str, cmd: list[str]) -> None:
    print(f"\n=== {label} ===")
    subprocess.run(cmd, cwd=ROOT, check=True, shell=os.name == "nt")


def main() -> int:
    py = sys.executable
    try:
        run_step("build:web", ["npm", "run", "build:web"])
        run_step("API", [py, "scripts/remote-deploy-api-update.py"])
        run_step("portal web", [py, "scripts/deploy-portal-web.py"])
    except subprocess.CalledProcessError as e:
        print(f"\nDeploy failed (exit {e.returncode})", file=sys.stderr)
        return e.returncode or 1

    print("\n=== ALL DONE ===")
    print("Portal: https://trassa.duckdns.org/#/")
    print("API:    https://trassa.duckdns.org/api/health")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
