/**
 * Личный планнер подрядчика — записи по дням (localStorage, по e-mail).
 */

export type ContractorPlannerEntry = {
  id: string;
  contractorEmailNorm: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  done: boolean;
  createdAt: string;
};

export const CONTRACTOR_PLANNER_UPDATED_EVENT = "trassa-contractor-planner-updated";

const STORAGE_KEY = "trassa-contractor-planner-v1";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAll(): ContractorPlannerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as ContractorPlannerEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeAll(items: ContractorPlannerEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CONTRACTOR_PLANNER_UPDATED_EVENT));
  } catch {
    /* ignore quota */
  }
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `pl-${globalThis.crypto.randomUUID()}`;
  }
  return `pl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function listPlannerEntries(contractorEmailNorm: string): ContractorPlannerEntry[] {
  const norm = normalizeEmail(contractorEmailNorm);
  return readAll()
    .filter((e) => e.contractorEmailNorm === norm)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function listPlannerEntriesForDate(
  contractorEmailNorm: string,
  date: string
): ContractorPlannerEntry[] {
  return listPlannerEntries(contractorEmailNorm).filter((e) => e.date === date);
}

export function listUpcomingPlannerEntries(
  contractorEmailNorm: string,
  limit = 8,
  now = new Date()
): ContractorPlannerEntry[] {
  const today = toDateKey(now);
  return listPlannerEntries(contractorEmailNorm)
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(a.done) - Number(b.done))
    .slice(0, limit);
}

export function addPlannerEntry(
  contractorEmailNorm: string,
  date: string,
  title: string
): ContractorPlannerEntry | null {
  const norm = normalizeEmail(contractorEmailNorm);
  const trimmed = title.trim();
  if (!norm || !date || !trimmed) return null;
  const entry: ContractorPlannerEntry = {
    id: newId(),
    contractorEmailNorm: norm,
    date,
    title: trimmed,
    done: false,
    createdAt: new Date().toISOString(),
  };
  const items = readAll();
  items.push(entry);
  writeAll(items);
  return entry;
}

export function deletePlannerEntry(contractorEmailNorm: string, id: string): void {
  const norm = normalizeEmail(contractorEmailNorm);
  writeAll(readAll().filter((e) => !(e.id === id && e.contractorEmailNorm === norm)));
}

export function togglePlannerEntryDone(contractorEmailNorm: string, id: string): void {
  const norm = normalizeEmail(contractorEmailNorm);
  writeAll(
    readAll().map((e) =>
      e.id === id && e.contractorEmailNorm === norm ? { ...e, done: !e.done } : e
    )
  );
}

export function countPlannerEntriesByDate(
  contractorEmailNorm: string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of listPlannerEntries(contractorEmailNorm)) {
    counts[e.date] = (counts[e.date] ?? 0) + 1;
  }
  return counts;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatPlannerDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

export function plannerEntryToPanelItem(entry: ContractorPlannerEntry) {
  return {
    id: entry.id,
    title: entry.title,
    dueAt: `${entry.date}T12:00:00`,
    dateLabel: formatPlannerDayLabel(entry.date),
    done: entry.done,
    kind: "custom" as const,
  };
}
