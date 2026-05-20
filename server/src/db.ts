import fs from "node:fs";
import path from "node:path";
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
`);

/** Встроенные администраторы (как в adminAuth на клиенте). */
function seedAdminUsers(): void {
  const count = db.prepare("SELECT COUNT(*) AS c FROM admin_users").get() as { c: number };
  if (count.c > 0) return;
  const builtins = [
    { email: "ksenia@trassa.local", password: "KseniaAdm8" },
    { email: "anastasia@trassa.local", password: "NastiaAdm8" },
  ];
  const now = new Date().toISOString();
  const insert = db.prepare(
    "INSERT INTO admin_users (email_norm, password_hash, created_at) VALUES (?, ?, ?)"
  );
  for (const u of builtins) {
    const hash = bcrypt.hashSync(u.password, 12);
    insert.run(u.email.toLowerCase(), hash, now);
  }
  console.log("[db] seeded admin_users:", builtins.length);
}

seedAdminUsers();

export type UserRow = {
  id: string;
  email_norm: string;
  password_hash: string;
  profile_json: string;
  created_at: string;
};
