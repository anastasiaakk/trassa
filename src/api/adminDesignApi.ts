import { getApiBase } from "./authApi";
import { getAdminApiToken } from "./adminApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { PortalDesignTokensV1 } from "../design-system/portalDesignTokens";

function adminHeaders(): HeadersInit {
  const token = getAdminApiToken();
  return token
    ? { "X-Trassa-Admin-Token": token, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function adminDesignSystemAiChat(input: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  currentTokens: PortalDesignTokensV1;
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/admin/ai/design-system`, {
      method: "POST",
      headers: adminHeaders(),
      credentials: "include",
      body: JSON.stringify({
        messages: input.messages,
        currentTokens: input.currentTokens,
      }),
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
