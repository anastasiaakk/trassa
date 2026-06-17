import { getApiBase } from "./authApi";
import { getStoredAccessToken } from "./authApi";
import { fetchWithTimeout } from "./fetchWithTimeout";
import type { ChatTurn } from "../utils/aiAssistantReply";

export async function fetchTbotStatus(): Promise<
  | { ok: true; configured: boolean; model: string; provider?: string; providerLabel?: string }
  | { ok: false }
> {
  const base = getApiBase();
  try {
    const res = await fetchWithTimeout(`${base}/api/tbot/status`, { credentials: "include" });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as {
      configured?: boolean;
      model?: string;
      provider?: string;
      providerLabel?: string;
    };
    return {
      ok: true,
      configured: Boolean(body.configured),
      model: body.model ?? "gpt-4o-mini",
      provider: body.provider,
      providerLabel: body.providerLabel,
    };
  } catch {
    return { ok: false };
  }
}

export async function tbotChat(
  history: ChatTurn[]
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const base = getApiBase();
  const messages = history.map((m) => ({
    role: m.role === "ai" ? ("assistant" as const) : ("user" as const),
    content: m.text,
  }));

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const bearer = getStoredAccessToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  try {
    const res = await fetchWithTimeout(`${base}/api/tbot/chat`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ messages }),
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
