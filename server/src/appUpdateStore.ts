import { db } from "./db.js";

const KEY = "app_update";

export type AppUpdateManifest = {
  version: string;
  setupUrl: string;
  releaseNotes: string;
  updatedAt: string;
};

const DEFAULT_MANIFEST: AppUpdateManifest = {
  version: "0.2.0",
  setupUrl: "https://github.com/anastasiaakk/trassa/releases/latest/download/trassa-setup.exe",
  releaseNotes: "",
  updatedAt: new Date(0).toISOString(),
};

function row(): { value_json: string } | undefined {
  return db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(KEY) as
    | { value_json: string }
    | undefined;
}

export function readAppUpdateManifest(): AppUpdateManifest {
  const r = row();
  if (!r) return { ...DEFAULT_MANIFEST };
  try {
    const data = JSON.parse(r.value_json) as Partial<AppUpdateManifest>;
    return {
      version: String(data.version ?? DEFAULT_MANIFEST.version),
      setupUrl: String(data.setupUrl ?? DEFAULT_MANIFEST.setupUrl),
      releaseNotes: String(data.releaseNotes ?? ""),
      updatedAt: String(data.updatedAt ?? DEFAULT_MANIFEST.updatedAt),
    };
  } catch {
    return { ...DEFAULT_MANIFEST };
  }
}

export function writeAppUpdateManifest(
  input: Pick<AppUpdateManifest, "version" | "setupUrl" | "releaseNotes">,
  updatedBy: string
): AppUpdateManifest {
  const manifest: AppUpdateManifest = {
    version: input.version.trim(),
    setupUrl: input.setupUrl.trim(),
    releaseNotes: input.releaseNotes.trim(),
    updatedAt: new Date().toISOString(),
  };
  const now = manifest.updatedAt;
  db.prepare(
    `INSERT INTO portal_kv (key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`
  ).run(KEY, JSON.stringify(manifest), now, updatedBy);
  return manifest;
}
