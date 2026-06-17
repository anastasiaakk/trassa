#!/usr/bin/env python3
"""Smoke-test admin devices API on production or local."""
from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("TRASSA_PROBE_BASE", "https://trassa.duckdns.org").rstrip("/")
EMAIL = os.environ.get("TRASSA_PROBE_ADMIN_EMAIL", "ksenia@trassa.local")
PASSWORD = os.environ.get("TRASSA_PROBE_ADMIN_PASSWORD", "KseniaAdm8")
CTX = ssl.create_default_context()


def req(method: str, path: str, body: dict | None = None, headers: dict | None = None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", **(headers or {})}
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=30, context=CTX) as res:
        return res.status, json.loads(res.read().decode())


def main() -> int:
    errors: list[str] = []
    print(f"Base: {BASE}")

    try:
        st, health = req("GET", "/api/health")
        print(f"health: {st} {health}")
        if not health.get("ok"):
            errors.append("health not ok")
    except urllib.error.HTTPError as e:
        errors.append(f"health HTTP {e.code}")
    except Exception as e:
        errors.append(f"health: {e}")

    try:
        st, login = req("POST", "/api/admin/login", {"email": EMAIL, "password": PASSWORD})
        token = login.get("adminToken")
        if not token:
            print("login:", login)
            errors.append("no admin token")
            return 1
        print(f"login: ok ({st})")
    except Exception as e:
        errors.append(f"login: {e}")
        return 1

    headers = {
        "X-Trassa-Admin-Token": token,
        "X-Trassa-Device-Id": "probe-admin-devices-check01",
    }

    try:
        st, body = req("GET", "/api/admin/devices", headers=headers)
        devices = body.get("devices") or []
        print(f"devices: ok={body.get('ok')} count={len(devices)} status={st}")
        if not body.get("ok"):
            errors.append("devices list not ok")
        geo_count = sum(
            1
            for d in devices
            if d.get("geoLat") is not None and d.get("geoLng") is not None
        )
        print(f"  with GPS fields: {geo_count}")
    except Exception as e:
        errors.append(f"devices: {e}")
        devices = []

    if devices:
        did = devices[0]["id"]
        for ep in ("visits", "location"):
            try:
                st, j = req("GET", f"/api/admin/devices/{did}/{ep}", headers=headers)
                ok = j.get("ok")
                print(f"{ep}: status={st} ok={ok}")
                if not ok:
                    errors.append(f"{ep} not ok: {j.get('error')}")
                if ep == "location":
                    loc = j.get("location")
                    if loc:
                        print(
                            f"  -> {loc.get('source')} "
                            f"{loc.get('lat')},{loc.get('lng')} "
                            f"acc={loc.get('accuracyM')}"
                        )
                    else:
                        print(f"  -> no location, hint={bool(j.get('hint'))}")
            except Exception as e:
                errors.append(f"{ep}: {e}")
    else:
        print("no devices — visits/location skipped")

    if errors:
        print("\nFAILURES:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
