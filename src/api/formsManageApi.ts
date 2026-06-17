import { getApiBase, getStoredAccessToken } from "./authApi";
import { getAdminApiToken } from "./adminApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { isAuthApiEnabled } from "../utils/authMode";
import type {
  AdminFormsStore,
  FormSubmission,
  FormTemplate,
} from "../types/adminForms";

function formatNetworkError(e: unknown): string {
  const raw = e instanceof Error ? e.message : "Сеть недоступна.";
  if (raw === "Failed to fetch" || (e instanceof TypeError && raw.includes("fetch"))) {
    return "Сервер не ответил (обрыв соединения). Проверьте интернет или обновите страницу (Ctrl+F5).";
  }
  return raw;
}

function manageHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const admin = getAdminApiToken();
  if (admin) {
    headers["X-Trassa-Admin-Token"] = admin;
    return headers;
  }
  const bearer = getStoredAccessToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  return headers;
}

export function hasFormsManageApiAuth(): boolean {
  return Boolean(getAdminApiToken() || getStoredAccessToken());
}

/** API forms/manage: cookie-сессия достаточна (credentials: include). */
export function canUseFormsManageApi(): boolean {
  return isAuthApiEnabled();
}

export async function fetchFormsManageStore(): Promise<
  { ok: true; store: AdminFormsStore } | { ok: false; error: string; status?: number }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/forms/manage/state`,
      {
        headers: manageHeaders(),
        credentials: "include",
      },
      60_000
    );
    let body: { ok?: boolean; store?: AdminFormsStore; error?: string };
    try {
      body = (await res.json()) as typeof body;
    } catch {
      return {
        ok: false,
        status: res.status,
        error: res.ok
          ? "Некорректный ответ сервера."
          : `Ошибка сервера (${res.status}). Попробуйте обновить страницу.`,
      };
    }
    if (!res.ok || body.ok === false || !body.store) {
      return { ok: false, status: res.status, error: body.error ?? res.statusText };
    }
    return { ok: true, store: body.store };
  } catch (e) {
    return { ok: false, error: formatNetworkError(e) };
  }
}

export async function putFormsManageStore(
  store: AdminFormsStore
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/manage/state`, {
      method: "PUT",
      headers: { ...manageHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ store }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatNetworkError(e) };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });
}

export async function importFormsManageFile(
  file: File,
  title?: string,
  owner: "admin" | "rador" = "rador"
): Promise<
  | {
      ok: true;
      template: FormTemplate;
      store: AdminFormsStore;
      sheetName?: string | null;
      rowCount?: number;
      usedAi?: boolean;
      sheetCount?: number;
    }
  | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const dataBase64 = await fileToBase64(file);
    const res = await fetchWithTimeout(
      `${base}/api/forms/manage/import`,
      {
        method: "POST",
        headers: { ...manageHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title?.trim() || undefined,
          filename: file.name,
          dataBase64,
          owner,
        }),
      },
      180_000
    );
    let body: {
      ok?: boolean;
      template?: FormTemplate;
      store?: AdminFormsStore;
      sheetName?: string | null;
      rowCount?: number;
      usedAi?: boolean;
      sheetCount?: number;
      error?: string;
    };
    try {
      body = (await res.json()) as typeof body;
    } catch {
      return {
        ok: false,
        error: res.ok
          ? "Некорректный ответ сервера при импорте."
          : `Ошибка сервера (${res.status}). Попробуйте позже или меньший файл.`,
      };
    }
    const parsedBody = body;
    if (!res.ok || parsedBody.ok === false || !parsedBody.template) {
      return { ok: false, error: parsedBody.error ?? res.statusText };
    }
    let store = parsedBody.store;
    if (!store) {
      const storeR = await fetchFormsManageStore();
      if (!storeR.ok) {
        return { ok: false, error: storeR.error };
      }
      store = storeR.store;
    }
    return {
      ok: true,
      template: parsedBody.template,
      store,
      sheetName: parsedBody.sheetName,
      rowCount: parsedBody.rowCount,
      usedAi: parsedBody.usedAi,
      sheetCount: parsedBody.sheetCount,
    };
  } catch (e) {
    const msg = formatNetworkError(e);
    if (msg.includes("обрыв соединения")) {
      return {
        ok: false,
        error:
          "Сервер не ответил при импорте. Файл слишком большой или разбор занял слишком много времени — попробуйте меньший Excel (до 5 МБ) или CSV.",
      };
    }
    return { ok: false, error: msg };
  }
}

export async function assignFormsManage(input: {
  templateId: string;
  contractorEmails: string[];
}): Promise<
  { ok: true; added: number; store: AdminFormsStore } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/manage/assign`, {
      method: "POST",
      headers: { ...manageHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      added?: number;
      store?: AdminFormsStore;
      error?: string;
    };
    if (!res.ok || body.ok === false || !body.store) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, added: body.added ?? 0, store: body.store };
  } catch (e) {
    return { ok: false, error: formatNetworkError(e) };
  }
}

export async function fetchFormsManageSubmission(
  templateId: string,
  contractorEmailNorm: string
): Promise<
  | { ok: true; template: FormTemplate; submission: FormSubmission | null }
  | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/forms/manage/submission/${encodeURIComponent(templateId)}/${encodeURIComponent(contractorEmailNorm)}`,
      { headers: manageHeaders(), credentials: "include" }
    );
    const body = (await res.json()) as {
      ok?: boolean;
      template?: FormTemplate;
      submission?: FormSubmission | null;
      error?: string;
    };
    if (!res.ok || body.ok === false || !body.template) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, template: body.template, submission: body.submission ?? null };
  } catch (e) {
    return { ok: false, error: formatNetworkError(e) };
  }
}
