#!/usr/bin/env python3
"""Выгрузка визитов устройств за сегодня (MSK) с production SQLite."""
from __future__ import annotations

import base64
import csv
import json
import io
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from trassa_ssh import connect_trassa_ssh

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "exports"
DB_CANDIDATES = [
    "/var/lib/trassa/api-data/app.db",
    "/root/trassa-server/data/app.db",
]

# Сегодня по Москве (UTC+3)
MSK = timezone(timedelta(hours=3))


def today_msk() -> date:
    return datetime.now(MSK).date()


def run_sqlite_query(ssh, db_path: str, sql: str) -> list[list[str]]:
    one_line = " ".join(sql.split())
    node_script = f"""const {{DatabaseSync}} = require('node:sqlite');
const db = new DatabaseSync({json.dumps(db_path)});
const rows = db.prepare({json.dumps(one_line)}).all();
if (!rows.length) process.exit(0);
const keys = Object.keys(rows[0]);
process.stdout.write(keys.join('\\t') + '\\n');
for (const r of rows) {{
  process.stdout.write(keys.map((k) => String(r[k] ?? '')).join('\\t') + '\\n');
}}
"""
    payload = base64.b64encode(node_script.encode("utf-8")).decode("ascii")
    cmd = f"echo {payload} | base64 -d | node"
    _, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if code != 0:
        raise RuntimeError(f"node query failed ({code}): {err or out}")
    lines = [ln for ln in out.strip().splitlines() if ln.strip()]
    if not lines:
        return []
    rows: list[list[str]] = []
    for ln in lines:
        rows.append(ln.split("\t"))
    return rows


def find_db(ssh) -> str:
    for path in DB_CANDIDATES:
        _, stdout, _ = ssh.exec_command(f"test -f {path} && echo ok", timeout=30)
        if stdout.read().decode().strip() == "ok":
            return path
    raise RuntimeError(f"DB not found in {DB_CANDIDATES}")


def main() -> int:
    day = today_msk()
    day_s = day.isoformat()
    next_s = (day + timedelta(days=1)).isoformat()

    ssh = connect_trassa_ssh()
    try:
        db_path = find_db(ssh)
        print(f"DB: {db_path}")
        print(f"Дата (МСК): {day_s}")

        visits_sql = f"""
SELECT
  v.seen_at AS visit_time,
  d.label AS device_label,
  COALESCE(d.marketing_model, '') AS model,
  COALESCE(v.user_email, d.user_email, '') AS user_email,
  v.ip AS ip,
  d.id AS device_id,
  COALESCE(d.consent_at, '') AS consent_at
FROM portal_device_visits v
JOIN portal_devices d ON d.id = v.device_id
WHERE v.seen_at >= '{day_s}' AND v.seen_at < '{next_s}'
ORDER BY v.seen_at ASC;
""".strip()

        devices_sql = f"""
SELECT
  d.last_seen_at AS last_seen,
  d.first_seen_at AS first_seen,
  d.label AS device_label,
  COALESCE(d.marketing_model, '') AS model,
  COALESCE(d.user_email, '') AS user_email,
  d.ip_last AS ip,
  d.id AS device_id,
  COALESCE(d.consent_at, '') AS consent_at,
  (SELECT COUNT(*) FROM portal_device_visits v
   WHERE v.device_id = d.id AND v.seen_at >= '{day_s}' AND v.seen_at < '{next_s}') AS visits_today
FROM portal_devices d
WHERE d.last_seen_at >= '{day_s}' AND d.last_seen_at < '{next_s}'
ORDER BY d.last_seen_at DESC;
""".strip()

        visit_rows = run_sqlite_query(ssh, db_path, visits_sql)
        device_rows = run_sqlite_query(ssh, db_path, devices_sql)

        OUT_DIR.mkdir(parents=True, exist_ok=True)
        stamp = day.strftime("%Y-%m-%d")
        visits_csv = OUT_DIR / f"device-visits-{stamp}.csv"
        devices_csv = OUT_DIR / f"devices-active-{stamp}.csv"

        def write_csv(path: Path, rows: list[list[str]]) -> None:
            with path.open("w", encoding="utf-8-sig", newline="") as f:
                if not rows:
                    f.write("no_data\n")
                    return
                writer = csv.writer(f, delimiter=";")
                for row in rows:
                    writer.writerow(row)
            print(f"  -> {path} ({max(0, len(rows) - 1)} записей)")

        write_csv(visits_csv, visit_rows)
        write_csv(devices_csv, device_rows)

        # Краткая сводка в stdout
        visit_count = max(0, len(visit_rows) - 1) if visit_rows else 0
        device_count = max(0, len(device_rows) - 1) if device_rows else 0
        print(f"\nИтого: {device_count} устройств активны сегодня, {visit_count} визитов (сессий).")

        if device_rows and len(device_rows) > 1:
            print("\nУстройства за сегодня:")
            hdr = device_rows[0]
            idx = {name: i for i, name in enumerate(hdr)}
            for row in device_rows[1:]:
                label = row[idx.get("device_label", 2)]
                email = row[idx.get("user_email", 4)] or "—"
                ip = row[idx.get("ip", 5)]
                last = row[idx.get("last_seen", 0)]
                visits = row[idx.get("visits_today", 8)]
                print(f"  {last} | {label} | {email} | {ip} | визитов: {visits}")

        return 0
    finally:
        ssh.close()


if __name__ == "__main__":
    raise SystemExit(main())
