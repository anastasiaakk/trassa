import { randomUUID } from "node:crypto";
import { Agent, fetch as undiciFetch } from "undici";

const OAUTH_URL =
  process.env.GIGACHAT_OAUTH_URL?.trim() ||
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const DEFAULT_SCOPE = process.env.GIGACHAT_SCOPE?.trim() || "GIGACHAT_API_PERS";

let cachedToken: { token: string; expiresAtMs: number } | undefined;

function gigachatTlsInsecure(): boolean {
  const raw = process.env.GIGACHAT_TLS_INSECURE?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
}

let tlsAgent: Agent | undefined;

function getGigachatDispatcher(): Agent | undefined {
  if (!gigachatTlsInsecure()) return undefined;
  if (!tlsAgent) {
    tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });
  }
  return tlsAgent;
}

export async function fetchGigachat(
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    signal: AbortSignal;
  }
): Promise<Response> {
  const dispatcher = getGigachatDispatcher();
  if (!dispatcher) {
    return fetch(url, init);
  }
  return undiciFetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    signal: init.signal,
    dispatcher,
  }) as unknown as Promise<Response>;
}

function parseExpiresAtMs(expiresAt: number | undefined, now: number): number {
  if (typeof expiresAt !== "number" || !Number.isFinite(expiresAt)) {
    return now + 30 * 60 * 1000;
  }
  return expiresAt < 1e12 ? expiresAt * 1000 : expiresAt;
}

export async function getGigachatAccessToken(): Promise<string> {
  const authKey = process.env.GIGACHAT_AUTH_KEY?.trim();
  if (!authKey) throw new Error("GIGACHAT_AUTH_KEY не задан");

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAtMs > now + 60_000) {
    return cachedToken.token;
  }

  const res = await fetchGigachat(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${authKey}`,
      RqUID: randomUUID(),
    },
    body: `scope=${encodeURIComponent(DEFAULT_SCOPE)}`,
    signal: AbortSignal.timeout(30_000),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_at?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    const dataMsg = (data as { message?: string }).message;
    const detail = data.error_description || data.error || dataMsg;
    throw new Error(detail ?? `GigaChat OAuth (${res.status})`);
  }

  cachedToken = {
    token: data.access_token,
    expiresAtMs: parseExpiresAtMs(data.expires_at, now),
  };
  return data.access_token;
}
