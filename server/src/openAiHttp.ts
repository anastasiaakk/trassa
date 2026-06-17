import { ProxyAgent, fetch as undiciFetch } from "undici";

export type OpenAiFetchInit = {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
};

/** HTTP/SOCKS5-прокси только для OpenAI (не трогает остальные исходящие запросы сервера). */
export function resolveOpenAiProxyUrl(): string | undefined {
  const raw =
    process.env.OPENAI_HTTPS_PROXY?.trim() ||
    process.env.OPENAI_HTTP_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  return raw || undefined;
}

let cachedDispatcher: ProxyAgent | undefined;
let cachedProxyUrl: string | undefined;

function getOpenAiDispatcher(proxyUrl: string): ProxyAgent {
  if (!cachedDispatcher || cachedProxyUrl !== proxyUrl) {
    cachedDispatcher = new ProxyAgent(proxyUrl);
    cachedProxyUrl = proxyUrl;
  }
  return cachedDispatcher;
}

/** fetch к OpenAI: через OPENAI_HTTPS_PROXY, если задан (США/ЕС и т.п.). */
export async function openAiFetch(url: string, init: OpenAiFetchInit): Promise<Response> {
  const proxyUrl = resolveOpenAiProxyUrl();
  if (!proxyUrl) {
    return fetch(url, init);
  }
  return undiciFetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    signal: init.signal,
    dispatcher: getOpenAiDispatcher(proxyUrl),
  }) as unknown as Promise<Response>;
}

export function isOpenAiGeoBlockMessage(message: string): boolean {
  return /country|region|territory not supported/i.test(message);
}
