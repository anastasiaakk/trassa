import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Десктоп: БД в %AppData% (Electron), а не в Program Files. */
const dataDir = process.env.TRASSA_DATA_DIR?.trim()
  ? path.resolve(process.env.TRASSA_DATA_DIR)
  : path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "app.db");

/** Встроенный SQLite (Node 22.13+), без нативного addon — нет конфликтов версий Node. */
export const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA busy_timeout = 5000`);
db.exec(`PRAGMA synchronous = NORMAL`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email_norm TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS portal_kv (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    email_norm TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS client_events (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_client_events_created ON client_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
  CREATE TABLE IF NOT EXISTS portal_devices (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    user_agent TEXT NOT NULL DEFAULT '',
    ip_last TEXT NOT NULL DEFAULT '',
    user_id TEXT,
    user_email TEXT,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    banned INTEGER NOT NULL DEFAULT 0,
    banned_at TEXT,
    banned_by TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_portal_devices_last_seen ON portal_devices(last_seen_at);
  CREATE INDEX IF NOT EXISTS idx_portal_devices_banned ON portal_devices(banned);
  CREATE TABLE IF NOT EXISTS portal_violations (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    device_id TEXT NOT NULL,
    device_label TEXT NOT NULL DEFAULT '',
    user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    browser TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_portal_violations_created ON portal_violations(created_at);
  CREATE INDEX IF NOT EXISTS idx_portal_violations_device ON portal_violations(device_id);
  CREATE TABLE IF NOT EXISTS portal_device_visits (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    seen_at TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    user_id TEXT,
    user_email TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_portal_device_visits_device ON portal_device_visits(device_id, seen_at DESC);
`);

try {
  db.exec(`ALTER TABLE portal_violations ADD COLUMN browser TEXT NOT NULL DEFAULT ''`);
} catch {
  /* column exists */
}

try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN admin_note TEXT NOT NULL DEFAULT ''`);
} catch {
  /* column exists */
}

try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN screen_w INTEGER`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN screen_h INTEGER`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN screen_dpr REAL`);
} catch {
  /* column exists */
}

try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN marketing_model TEXT NOT NULL DEFAULT ''`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN model_confidence INTEGER NOT NULL DEFAULT 0`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN model_source TEXT NOT NULL DEFAULT ''`);
} catch {
  /* column exists */
}

try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN is_personal INTEGER NOT NULL DEFAULT 0`);
} catch {
  /* column exists */
}

try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN geo_lat REAL`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN geo_lng REAL`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN geo_accuracy_m REAL`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN geo_updated_at TEXT`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN consent_at TEXT`);
} catch {
  /* column exists */
}
try {
  db.exec(`ALTER TABLE portal_devices ADD COLUMN consent_policy_version TEXT NOT NULL DEFAULT ''`);
} catch {
  /* column exists */
}

/** Встроенные администраторы (как в adminAuth на клиенте). */
function ensureBuiltinAdminUsers(): void {
  const builtins = [
    { email: "ksenia@trassa.local", password: "KseniaAdm8" },
    { email: "anastasia@trassa.local", password: "NastiaAdm8" },
    { email: "anna@indorsoft.local", password: "AnnaInd8" },
  ];
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT OR IGNORE INTO admin_users (email_norm, password_hash, created_at) VALUES (?, ?, ?)"
  );
  let added = 0;
  for (const u of builtins) {
    const hash = bcrypt.hashSync(u.password, 12);
    const info = insert.run(u.email.toLowerCase(), hash, now);
    if (info.changes > 0) added += 1;
  }
  if (added > 0) {
    console.log("[db] ensured admin_users, added:", added);
  }
}

/** Один визит из last_seen для устройств без журнала (после обновления). */
function backfillDeviceVisitsFromLastSeen(): void {
  const rows = db
    .prepare(
      `SELECT d.id, d.last_seen_at, d.ip_last, d.user_id, d.user_email
       FROM portal_devices d
       WHERE NOT EXISTS (SELECT 1 FROM portal_device_visits v WHERE v.device_id = d.id)`
    )
    .all() as Array<{
    id: string;
    last_seen_at: string;
    ip_last: string;
    user_id: string | null;
    user_email: string | null;
  }>;
  if (rows.length === 0) return;
  const insert = db.prepare(
    `INSERT INTO portal_device_visits (id, device_id, seen_at, ip, user_id, user_email)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const d of rows) {
    insert.run(randomUUID(), d.id, d.last_seen_at, d.ip_last, d.user_id, d.user_email);
  }
  console.log("[db] backfilled portal_device_visits:", rows.length);
}

backfillDeviceVisitsFromLastSeen();

ensureBuiltinAdminUsers();

export type UserRow = {
  id: string;
  email_norm: string;
  password_hash: string;
  profile_json: string;
  created_at: string;
};
