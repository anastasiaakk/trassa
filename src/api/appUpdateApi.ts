import { getApiBase } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { adminHeaders } from "./portalApi";

export type AppUpdateManifest = {
  version: string;
  setupUrl: string;
  releaseNotes: string;
  updatedAt?: string;
};

export async function fetchAppUpdateManifest(): Promise<
  { ok: true; manifest: AppUpdateManifest } | { ok: false; error: string }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/app-update/current`, { cache: "no-store" });
    const body = (await res.json()) as { ok?: boolean; manifest?: AppUpdateManifest; error?: string };
    if (!res.ok || !body.ok || !body.manifest) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, manifest: body.manifest };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}

export async function publishAppUpdate(manifest: {
  version: string;
  setupUrl: string;
  releaseNotes: string;
}): Promise<{ ok: true; manifest: AppUpdateManifest } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/app-update/publish`, {
      method: "PUT",
      credentials: "include",
      headers: adminHeaders(),
      body: JSON.stringify(manifest),
    });
    const body = (await res.json()) as { ok?: boolean; manifest?: AppUpdateManifest; error?: string };
    if (!res.ok || !body.ok || !body.manifest) {
      return { ok: false, error: body.error ?? res.statusText };
    }
    return { ok: true, manifest: body.manifest };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
