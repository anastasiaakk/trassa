import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";

const ADMIN_API_TOKEN_KEY = "trassa-admin-api-token";

export function getAdminApiToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_API_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminApiToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(ADMIN_API_TOKEN_KEY, token);
    else sessionStorage.removeItem(ADMIN_API_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function adminApiLogin(
  email: string,
  password: string
): Promise<
  { ok: true; adminToken: string } | { ok: false; error: string; status?: number }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = (await res.json()) as { ok?: boolean; adminToken?: string; error?: string };
    if (!res.ok || !body.ok || !body.adminToken) {
      return {
        ok: false,
        error: body.error ?? "Не удалось войти.",
        status: res.status,
      };
    }
    return { ok: true, adminToken: body.adminToken };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Сеть недоступна.",
    };
  }
}

export async function adminApiChangePassword(
  email: string,
  oldPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/password`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, oldPassword, newPassword }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
