import { PORTAL_KV } from "../config/portalKeys";
import { pushPortalKvWithAck } from "./portalSync";

const KEY = "trassa-violations-guard-v1";

export const VIOLATIONS_GUARD_CHANGED = "trassa-violations-guard-changed";

export type ViolationsGuardState = {
  enabled: boolean;
};

function parseState(raw: unknown): ViolationsGuardState {
  if (raw && typeof raw === "object" && "enabled" in raw) {
    return { enabled: (raw as ViolationsGuardState).enabled !== false };
  }
  return { enabled: true };
}

export function loadViolationsGuardState(): ViolationsGuardState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { enabled: true };
    return parseState(JSON.parse(raw) as unknown);
  } catch {
    return { enabled: true };
  }
}

export function isViolationsGuardEnabledClient(): boolean {
  return loadViolationsGuardState().enabled;
}

export async function saveViolationsGuardState(
  state: ViolationsGuardState
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await pushPortalKvWithAck(PORTAL_KV.VIOLATIONS_GUARD, {
    enabled: state.enabled,
  });
  if (result.ok) {
    window.dispatchEvent(new CustomEvent(VIOLATIONS_GUARD_CHANGED));
  }
  return result;
}
