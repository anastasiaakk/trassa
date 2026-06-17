import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { getAdminApiToken } from "./adminApi";
import { getPortalBrowserLabel } from "../utils/portalCaptureBrowser";
import { isViolationsGuardEnabledClient } from "../utils/violationsGuardMode";

export type PortalViolationRecord = {
  id: string;
  kind: string;
  kindLabel: string;
  deviceId: string;
  deviceLabel: string;
  deviceBanned?: boolean;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  ip: string;
  userAgent: string;
  browser: string;
  createdAt: string;
};

export type ViolationKind =
  | "screenshot_keyboard"
  | "screenshot_print"
  | "screenshot_mobile_hint"
  | "screenshot_mobile_focus"
  | "screenshot_mobile_viewport"
  | "screenshot_copy"
  | "screenshot_context_menu"
  | "screenshot_volume_keys"
  | "screenshot_capture_api";

let reportCooldownUntil = 0;

export async function reportPortalViolation(
  kind: ViolationKind,
  userName?: string | null
): Promise<void> {
  if (!isViolationsGuardEnabledClient()) return;

  const now = Date.now();
  if (now < reportCooldownUntil) return;
  reportCooldownUntil = now + 20_000;

  const base = getApiBase();
  try {
    await fetchWithTimeout(`${base}/api/violations/report`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind,
        userName: userName?.trim() || undefined,
        browser: getPortalBrowserLabel(),
      }),
    });
  } catch {
    /* сеть недоступна — предупреждение на экране всё равно показано */
  }
}

export async function adminListViolations(): Promise<
  | { ok: true; violations: PortalViolationRecord[]; smsConfigured: boolean; guardEnabled: boolean }
  | { ok: false; error: string }
> {
  const adminToken = getAdminApiToken();
  if (!adminToken) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/violations`, {
      credentials: "include",
      headers: {
        "X-Trassa-Admin-Token": adminToken,
      },
      cache: "no-store",
    });
    const body = (await res.json()) as {
      ok?: boolean;
      violations?: PortalViolationRecord[];
      smsConfigured?: boolean;
      guardEnabled?: boolean;
      error?: string;
    };
    if (!res.ok || !body.ok || !Array.isArray(body.violations)) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      violations: body.violations,
      smsConfigured: Boolean(body.smsConfigured),
      guardEnabled: body.guardEnabled !== false,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

function adminHeaders(): Record<string, string> | null {
  const adminToken = getAdminApiToken();
  if (!adminToken) return null;
  return {
    "X-Trassa-Admin-Token": adminToken,
  };
}

export async function adminDeleteViolation(
  violationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const headers = adminHeaders();
  if (!headers) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/admin/violations/${encodeURIComponent(violationId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers,
      }
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminClearViolations(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  const headers = adminHeaders();
  if (!headers) {
    return { ok: false, error: "Нет токена администратора." };
  }
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/violations`, {
      method: "DELETE",
      credentials: "include",
      headers,
    });
    const body = (await res.json()) as { ok?: boolean; deleted?: number; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, deleted: typeof body.deleted === "number" ? body.deleted : 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
