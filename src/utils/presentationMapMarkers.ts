import {
  formatSubjectDisplayName,
  SUBJECT_MARKERS_GEO,
  type SubjectMarkerGeo,
} from "../data/page2MapGeo";

export type PresentationMapMarker = {
  subject: SubjectMarkerGeo;
  orgCount: number;
};

function normalizeKey(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "")
    .replace(/\s+область$/, "")
    .replace(/^республика\s+/, "");
}

function findSubjectGeo(name: string): SubjectMarkerGeo | null {
  const key = normalizeKey(name);
  if (!key) return null;

  for (const subject of SUBJECT_MARKERS_GEO) {
    const variants = [subject.name, formatSubjectDisplayName(subject.name)].map(normalizeKey);
    if (variants.some((v) => v === key)) return subject;
  }

  for (const subject of SUBJECT_MARKERS_GEO) {
    const sk = normalizeKey(subject.name);
    if (key.includes(sk) || sk.includes(key)) return subject;
  }

  return null;
}

/** Субъекты РФ с числом организаций для меток на слайде презентации. */
export function resolvePresentationMapMarkers(
  orgSubjectNames: string[]
): PresentationMapMarker[] {
  const counts = new Map<number, number>();

  for (const raw of orgSubjectNames) {
    const subject = findSubjectGeo(raw);
    if (!subject) continue;
    counts.set(subject.id, (counts.get(subject.id) ?? 0) + 1);
  }

  if (counts.size === 0) {
    for (const subject of SUBJECT_MARKERS_GEO.slice(0, 14)) {
      counts.set(subject.id, 1);
    }
  }

  return SUBJECT_MARKERS_GEO.filter((s) => counts.has(s.id)).map((subject) => ({
    subject,
    orgCount: counts.get(subject.id) ?? 1,
  }));
}
