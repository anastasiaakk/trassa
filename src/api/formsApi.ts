import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type {
  FormDeadlineSnapshot,
  FormGridRow,
  FormMonitoringRow,
  FormSubmission,
  FormTemplate,
} from "../types/adminForms";
import type { FormAlert } from "../types/formAlerts";

export type RadorDashboardPayload = {
  updatedAt: string | null;
  monitoring: FormMonitoringRow[];
  snapshots: FormDeadlineSnapshot[];
};

export async function fetchRadorFormsDashboard(): Promise<
  { ok: true; data: RadorDashboardPayload } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/rador-dashboard`, {
      credentials: "include",
    });
    const body = (await res.json()) as RadorDashboardPayload & { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      data: {
        updatedAt: body.updatedAt ?? null,
        monitoring: Array.isArray(body.monitoring) ? body.monitoring : [],
        snapshots: Array.isArray(body.snapshots) ? body.snapshots : [],
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function fetchContractorAssignedForms(): Promise<
  | { ok: true; templates: FormTemplate[]; submissions: FormSubmission[] }
  | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/assigned`, {
      credentials: "include",
    });
    const body = (await res.json()) as {
      ok?: boolean;
      templates?: FormTemplate[];
      submissions?: FormSubmission[];
      error?: string;
    };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      templates: body.templates ?? [],
      submissions: body.submissions ?? [],
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function fetchContractorFormAlerts(): Promise<
  { ok: true; alerts: FormAlert[] } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/alerts`, { credentials: "include" });
    const body = (await res.json()) as { ok?: boolean; alerts?: FormAlert[]; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, alerts: body.alerts ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function fetchRadorFormAlerts(): Promise<
  { ok: true; alerts: FormAlert[]; unread: number } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/rador-alerts`);
    const body = (await res.json()) as {
      ok?: boolean;
      alerts?: FormAlert[];
      unread?: number;
      error?: string;
    };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      alerts: body.alerts ?? [],
      unread: typeof body.unread === "number" ? body.unread : 0,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function markFormAlertReadApi(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/alerts/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      credentials: "include",
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

export type FillFormFromFileResult = {
  cells: FormSubmission["cells"];
  rows?: FormGridRow[];
  message: string;
  usedAi?: boolean;
  mappedColumns?: number;
};

export async function fillContractorFormFromFile(
  templateId: string,
  filename: string,
  dataBase64: string,
  draft: { cells: FormSubmission["cells"]; rows?: FormGridRow[] }
): Promise<{ ok: true; data: FillFormFromFileResult } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/forms/submissions/${encodeURIComponent(templateId)}/fill-from-file`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ filename, dataBase64, cells: draft.cells, rows: draft.rows }),
      },
      120_000
    );
    const body = (await res.json()) as FillFormFromFileResult & { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      data: {
        cells: body.cells ?? {},
        rows: body.rows,
        message: body.message ?? "Данные подставлены.",
        usedAi: body.usedAi,
        mappedColumns: body.mappedColumns,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function saveContractorFormSubmission(
  templateId: string,
  payload: {
    cells: FormSubmission["cells"];
    rows?: FormGridRow[];
    sheets?: FormSubmission["sheets"];
  },
  submit: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/forms/submissions/${encodeURIComponent(templateId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...payload, submit }),
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
