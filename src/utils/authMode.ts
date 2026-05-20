/** Серверная аутентификация (JWT в httpOnly cookie). Включите `VITE_USE_AUTH_API=true` и прокси /api. */
export function isAuthApiEnabled(): boolean {
  const raw = import.meta.env.VITE_USE_AUTH_API;
  if (raw === "true") return true;
  if (raw === "false") return false;
  /** В desktop-сборке всегда работаем через общий API, даже если env не подхватился. */
  if (typeof window !== "undefined" && window.location.protocol === "file:") {
    return true;
  }
  return false;
}
