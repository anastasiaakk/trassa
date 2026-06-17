import { getApiBase } from "./authApi";
import { getAdminApiToken } from "./adminApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { DistributionProposal, Specialization } from "../utils/specializationsStorage";

export type SpecializationSummaryPayload = {
  specs: Specialization[];
  buckets: Array<{
    specialization: Specialization;
    counts: { students: number; contractors: number; total: number };
    students: Array<{
      emailNorm: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      roleLabel: string;
      contractorCompanyName: string;
      specializationId: string;
      createdAt: string;
      roleKind: "student" | "contractor";
    }>;
    contractors: Array<{
      emailNorm: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      roleLabel: string;
      contractorCompanyName: string;
      specializationId: string;
      createdAt: string;
      roleKind: "student" | "contractor";
    }>;
  }>;
  unassignedStudents: SpecializationSummaryPayload["buckets"][0]["students"];
  unassignedContractors: SpecializationSummaryPayload["buckets"][0]["contractors"];
  proposals: DistributionProposal[];
  totals: { students: number; contractors: number };
};

export async function fetchPublicSpecializations(): Promise<
  { ok: true; specializations: Specialization[] } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/specializations`);
    const body = (await res.json()) as { ok?: boolean; specializations?: Specialization[]; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, specializations: body.specializations ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

function adminHeaders(): HeadersInit {
  const token = getAdminApiToken();
  return token ? { "X-Trassa-Admin-Token": token } : {};
}

export async function fetchAdminSpecializationSummary(): Promise<
  { ok: true; summary: SpecializationSummaryPayload } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/specializations/summary`, {
      headers: adminHeaders(),
      credentials: "include",
    });
    const body = (await res.json()) as {
      ok?: boolean;
      summary?: SpecializationSummaryPayload;
      error?: string;
    };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    if (!body.summary) return { ok: false, error: "Пустой ответ сервера." };
    return { ok: true, summary: body.summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminUpdateSpecialization(
  id: string,
  patch: Partial<Pick<Specialization, "title" | "sortOrder" | "active">>
): Promise<{ ok: true; specialization: Specialization } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/specializations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const body = (await res.json()) as {
      ok?: boolean;
      specialization?: Specialization;
      error?: string;
    };
    if (!res.ok || body.ok === false || !body.specialization) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, specialization: body.specialization };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminDeleteSpecialization(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/specializations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders(),
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

export async function adminMoveUserSpecialization(
  emailNorm: string,
  specializationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(
      `${base}/api/admin/users/${encodeURIComponent(emailNorm)}/specialization`,
      {
        method: "PATCH",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ specializationId }),
      }
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function adminCreateDistributionProposal(input: {
  specializationId: string;
  studentEmailNorm: string;
  contractorEmailNorm: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/distribution/proposals`, {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
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

export function downloadAdminSpecializationsCsv(): void {
  const base = getApiBase();
  const token = getAdminApiToken();
  const url = `${base}/api/admin/specializations/export.csv`;
  const a = document.createElement("a");
  a.href = url;
  if (token) {
    void fetchWithTimeout(url, { headers: adminHeaders(), credentials: "include" })
      .then((r) => r.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `trassa-specializations-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(objectUrl);
      });
    return;
  }
  a.click();
}
