import { SUBJECT_MARKERS_GEO } from "../data/page2MapGeo";

const STORAGE_KEY = "trassa-map-subject-organizations-v1";

export type MapOrgKind = "education" | "contractors";

export type MapSubjectOrganization = {
  id: string;
  subjectName: string;
  kind: MapOrgKind;
  name: string;
};

type StoreFile = {
  entries: MapSubjectOrganization[];
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeEntry(entry: MapSubjectOrganization): MapSubjectOrganization {
  return {
    id: normalizeText(entry.id),
    subjectName: normalizeText(entry.subjectName),
    kind: entry.kind,
    name: normalizeText(entry.name),
  };
}

function defaultEntries(): MapSubjectOrganization[] {
  const subjects = Array.from(new Set(SUBJECT_MARKERS_GEO.map((s) => normalizeText(s.name))));
  const seedCore = subjects.slice(0, 10);
  const tom = "Томская";
  const seedSubjects =
    subjects.includes(tom) && !seedCore.includes(tom) ? [...seedCore, tom] : seedCore;
  const rows: MapSubjectOrganization[] = [];
  for (const subject of seedSubjects) {
    rows.push({
      id: crypto.randomUUID(),
      subjectName: subject,
      kind: "education",
      name: `${subject} государственный университет`,
    });
    rows.push({
      id: crypto.randomUUID(),
      subjectName: subject,
      kind: "contractors",
      name: `ООО «ДорСтрой ${subject}»`,
    });
  }
  return rows;
}

function readRaw(): StoreFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as Partial<StoreFile> | null;
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    const normalized = entries
      .filter(
        (x): x is MapSubjectOrganization =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as MapSubjectOrganization).id === "string" &&
          typeof (x as MapSubjectOrganization).subjectName === "string" &&
          ((x as MapSubjectOrganization).kind === "education" ||
            (x as MapSubjectOrganization).kind === "contractors") &&
          typeof (x as MapSubjectOrganization).name === "string"
      )
      .map(normalizeEntry)
      .filter((x) => x.id && x.subjectName && x.name);
    return { entries: normalized };
  } catch {
    return { entries: [] };
  }
}

function writeRaw(file: StoreFile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
  window.dispatchEvent(new CustomEvent("trassa-map-subject-organizations-changed"));
}

export function loadMapSubjectOrganizations(): MapSubjectOrganization[] {
  const data = readRaw();
  if (data.entries.length > 0) return data.entries;
  const defaults = defaultEntries();
  writeRaw({ entries: defaults });
  return defaults;
}

export function saveMapSubjectOrganizations(entries: MapSubjectOrganization[]): void {
  const normalized = entries
    .map(normalizeEntry)
    .filter((x) => x.id && x.subjectName && x.name)
    .sort((a, b) => {
      const bySubject = a.subjectName.localeCompare(b.subjectName, "ru");
      if (bySubject !== 0) return bySubject;
      const byKind = a.kind.localeCompare(b.kind, "ru");
      if (byKind !== 0) return byKind;
      return a.name.localeCompare(b.name, "ru");
    });
  writeRaw({ entries: normalized });
}

export function addMapSubjectOrganization(input: {
  subjectName: string;
  kind: MapOrgKind;
  name: string;
}): { ok: true } | { ok: false; error: string } {
  const subjectName = normalizeText(input.subjectName);
  const name = normalizeText(input.name);
  if (!subjectName) return { ok: false, error: "Выберите субъект." };
  if (!name) return { ok: false, error: "Введите наименование." };
  if (name.length > 240) return { ok: false, error: "Слишком длинное наименование (макс. 240)." };
  const entries = loadMapSubjectOrganizations();
  const exists = entries.some(
    (e) =>
      e.subjectName.toLowerCase() === subjectName.toLowerCase() &&
      e.kind === input.kind &&
      e.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) return { ok: false, error: "Такая запись уже существует." };
  entries.push({
    id: crypto.randomUUID(),
    subjectName,
    kind: input.kind,
    name,
  });
  saveMapSubjectOrganizations(entries);
  return { ok: true };
}

export function updateMapSubjectOrganization(
  id: string,
  patch: { subjectName: string; kind: MapOrgKind; name: string }
): { ok: true } | { ok: false; error: string } {
  const entries = loadMapSubjectOrganizations();
  const idx = entries.findIndex((x) => x.id === id);
  if (idx < 0) return { ok: false, error: "Запись не найдена." };
  const subjectName = normalizeText(patch.subjectName);
  const name = normalizeText(patch.name);
  if (!subjectName) return { ok: false, error: "Выберите субъект." };
  if (!name) return { ok: false, error: "Введите наименование." };
  const duplicate = entries.some(
    (e, i) =>
      i !== idx &&
      e.subjectName.toLowerCase() === subjectName.toLowerCase() &&
      e.kind === patch.kind &&
      e.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) return { ok: false, error: "Такая запись уже существует." };
  entries[idx] = {
    ...entries[idx],
    subjectName,
    kind: patch.kind,
    name,
  };
  saveMapSubjectOrganizations(entries);
  return { ok: true };
}

export function removeMapSubjectOrganization(id: string): void {
  const entries = loadMapSubjectOrganizations().filter((x) => x.id !== id);
  saveMapSubjectOrganizations(entries);
}

