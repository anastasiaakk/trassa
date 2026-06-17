/**
 * Справочник организаций для входа/регистрации подрядчиков.
 */

import { PORTAL_KV } from "../config/portalKeys";
import type { MapSubjectOrganization } from "./mapSubjectOrganizations";
import { pushPortalKvWithAck } from "./portalSync";

const STORAGE_KEY = "trassa-contractor-organizations-v1";

/** Начальный набор, если список ещё не задан администратором */
const DEFAULT_ORGANIZATIONS: string[] = [
  "ООО «ДорСтрой»",
  "АО «РегионАсфальт»",
  "ЗАО «МостСтрой»",
  "ООО «ТрассКомплект»",
  "ИП Иванов П.С.",
];

export function normalizeOrgName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function parseList(raw: string): string[] {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is string => typeof x === "string").map(normalizeOrgName).filter(Boolean);
  } catch {
    return [];
  }
}

/** Уникальные названия, отсортированные по алфавиту. Пустой список — только если ключ задан явно (админ удалил всё). */
export function loadContractorOrganizations(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      void saveContractorOrganizations([...DEFAULT_ORGANIZATIONS]);
      return [...DEFAULT_ORGANIZATIONS].sort((a, b) => a.localeCompare(b, "ru"));
    }
    const list = parseList(raw);
    const uniq = Array.from(new Set(list.map(normalizeOrgName))).filter(Boolean);
    return uniq.sort((a, b) => a.localeCompare(b, "ru"));
  } catch {
    return [...DEFAULT_ORGANIZATIONS].sort((a, b) => a.localeCompare(b, "ru"));
  }
}

export async function saveContractorOrganizations(
  names: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const uniq = Array.from(new Set(names.map(normalizeOrgName))).filter(Boolean);
  uniq.sort((a, b) => a.localeCompare(b, "ru"));
  return pushPortalKvWithAck(PORTAL_KV.CONTRACTOR_ORGS, uniq);
}

export async function addContractorOrganization(
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const n = normalizeOrgName(name);
  if (!n) {
    return { ok: false, error: "Введите название организации." };
  }
  if (n.length > 200) {
    return { ok: false, error: "Слишком длинное название (макс. 200 символов)." };
  }
  const list = loadContractorOrganizations();
  if (list.some((x) => x.toLowerCase() === n.toLowerCase())) {
    return { ok: false, error: "Такая организация уже есть в списке." };
  }
  return saveContractorOrganizations([...list, n]);
}

export async function removeContractorOrganization(
  name: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const n = normalizeOrgName(name);
  const list = loadContractorOrganizations().filter((x) => x !== n);
  return saveContractorOrganizations(list);
}

/** Фильтр для «умного поиска»: без учёта регистра, подстрока */
export function filterOrganizations(query: string, list: string[]): string[] {
  const q = normalizeOrgName(query).toLowerCase();
  if (!q) return list;
  return list.filter((org) => org.toLowerCase().includes(q));
}

export function isOrganizationInList(name: string, list: string[]): boolean {
  return resolveOrganizationFromInput(name, list) !== null;
}

/** Возвращает каноническое название из списка или null, если нет совпадения (учёт регистра). */
export function resolveOrganizationFromInput(input: string, list: string[]): string | null {
  const t = normalizeOrgName(input);
  if (!t) return null;
  const exact = list.find((x) => x === t);
  if (exact) return exact;
  return list.find((x) => x.toLowerCase() === t.toLowerCase()) ?? null;
}

/** Подрядчик с карты, которого ещё нет в списке для входа (по названию). */
export type MapContractorForLoginPick = {
  entryId: string;
  name: string;
  subjectName: string;
};

export function listMapContractorsForLoginPick(
  mapEntries: MapSubjectOrganization[],
  loginList: string[]
): MapContractorForLoginPick[] {
  const inLogin = new Set(loginList.map((x) => normalizeOrgName(x).toLowerCase()));
  const seenNames = new Set<string>();
  const out: MapContractorForLoginPick[] = [];

  for (const entry of mapEntries) {
    if (entry.kind !== "contractors") continue;
    const name = normalizeOrgName(entry.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (inLogin.has(key) || seenNames.has(key)) continue;
    seenNames.add(key);
    out.push({
      entryId: entry.id,
      name,
      subjectName: normalizeOrgName(entry.subjectName),
    });
  }

  return out.sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "ru");
    if (byName !== 0) return byName;
    return a.subjectName.localeCompare(b.subjectName, "ru");
  });
}
