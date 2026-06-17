export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;

function timeoutMessage(ms: number): string {
  return `Сервер не ответил за ${Math.round(ms / 1000)} с. Проверьте интернет или доступность API.`;
}

/** fetch с AbortSignal по таймауту. Сессия — через HttpOnly cookie после /api/portal/version. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const mergedInit: RequestInit = {
    ...init,
    credentials: init?.credentials ?? "include",
  };
  if (init?.signal) {
    return fetch(input, mergedInit);
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...mergedInit, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(timeoutMessage(timeoutMs));
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}
