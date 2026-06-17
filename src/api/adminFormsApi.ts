import { getApiBase } from "./authApi";
import { getAdminApiToken } from "./adminApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { AdminFormsStore, FormMonitoringRow, FormTemplate, FormDeadlineSnapshot } from "../types/adminForms";

function adminHeaders(): HeadersInit {
  const token = getAdminApiToken();
  return token ? { "X-Trassa-Admin-Token": token } : {};
}

export async function fetchAdminFormsStore(): Promise<
  { ok: true; store: AdminFormsStore } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/forms/state`, {
      headers: adminHeaders(),
      credentials: "include",
    });
    const body = (await res.json()) as { ok?: boolean; store?: AdminFormsStore; error?: string };
    if (!res.ok || body.ok === false || !body.store) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, store: body.store };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function putAdminFormsStore(
  store: AdminFormsStore
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/forms/state`, {
      method: "PUT",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ store }),
    });
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
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

export async function assignAdminForms(input: {
  templateId: string;
  contractorEmails: string[];
}): Promise<
  { ok: true; added: number; store: AdminFormsStore } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/forms/assign`, {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
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
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function importAdminFormFile(
  file: File,
  title?: string
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
      `${base}/api/admin/forms/import`,
      {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title?.trim() || undefined,
          filename: file.name,
          dataBase64,
        }),
      },
      120_000
    );
    const body = (await res.json()) as {
      ok?: boolean;
      template?: FormTemplate;
      store?: AdminFormsStore;
      sheetName?: string | null;
      rowCount?: number;
      usedAi?: boolean;
      sheetCount?: number;
      error?: string;
    };
    if (!res.ok || body.ok === false || !body.template || !body.store) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      template: body.template,
      store: body.store,
      sheetName: body.sheetName,
      rowCount: body.rowCount,
      usedAi: body.usedAi,
      sheetCount: body.sheetCount,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function generateAdminFillHints(input: {
  title: string;
  description?: string;
  layout?: "form" | "grid";
  deadlineAt?: string | null;
  columns: Array<{ title: string; type: string; required?: boolean; hint?: string }>;
}): Promise<{ ok: true; hints: string } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/ai/fill-hints`, {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const body = (await res.json()) as { ok?: boolean; hints?: string; error?: string };
    if (!res.ok || body.ok === false || !body.hints) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, hints: body.hints };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminAiChat(input: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  context?: string;
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/ai/chat`, {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const body = (await res.json()) as { ok?: boolean; reply?: string; error?: string };
    if (!res.ok || body.ok === false || !body.reply) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, reply: body.reply };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
