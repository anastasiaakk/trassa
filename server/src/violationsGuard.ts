import { db } from "./db.js";
import { PORTAL_KEYS } from "./portalKeys.js";

export type ViolationsGuardState = {
  enabled: boolean;
};

const DEFAULT: ViolationsGuardState = { enabled: true };

function parseState(raw: unknown): ViolationsGuardState {
  if (raw && typeof raw === "object" && "enabled" in raw) {
    return { enabled: (raw as ViolationsGuardState).enabled !== false };
  }
  return DEFAULT;
}

export function readViolationsGuardState(): ViolationsGuardState {
  const row = db
    .prepare("SELECT value_json FROM portal_kv WHERE key = ?")
    .get(PORTAL_KEYS.VIOLATIONS_GUARD) as { value_json: string } | undefined;
  if (!row) return DEFAULT;
  try {
    return parseState(JSON.parse(row.value_json) as unknown);
  } catch {
    return DEFAULT;
  }
}

export function isViolationsGuardEnabled(): boolean {
  return readViolationsGuardState().enabled;
}
