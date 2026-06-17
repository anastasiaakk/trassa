/** Совпадение строки с поисковым запросом кабинета (пустой запрос — всё видно). */
export function matchesCabinetSearch(query: string, ...parts: (string | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => (p ?? "").toLowerCase().includes(q));
}
