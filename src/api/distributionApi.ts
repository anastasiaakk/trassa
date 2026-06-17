import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { ContractorRecommendation } from "../utils/distributionRecommendations";

function getStoredAccessToken(): string | null {
  try {
    return sessionStorage.getItem("trassa_api_access_token");
  } catch {
    return null;
  }
}

export async function fetchContractorRecommendations(): Promise<
  { ok: true; items: ContractorRecommendation[]; total: number } | { ok: false; error: string }
> {
  const base = getApiBase();
  const headers: Record<string, string> = {};
  const bearer = getStoredAccessToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  try {
    const res = await fetchWithTimeout(`${base}/api/distribution/recommendations`, {
      credentials: "include",
      headers,
    });
    const body = (await res.json()) as {
      ok?: boolean;
      items?: ContractorRecommendation[];
      total?: number;
      error?: string;
    };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return {
      ok: true,
      items: Array.isArray(body.items) ? body.items : [],
      total: typeof body.total === "number" ? body.total : 0,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
