/**
 * Спецификации (подгруппы «распределяющей шляпы») — только админ регулирует список.
 */

import { PORTAL_KV } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";
import type { ProfileSettingsData } from "../profileSettingsStorage";
import { listRegisteredUsers, type LocalUserRecord } from "./localAuth";

const STORAGE_KEY = "trassa-specializations-v1";
const PROPOSALS_KEY = "trassa-distribution-proposals-v1";

export type Specialization = {
  id: string;
  title: string;
  sortOrder: number;
  active: boolean;
};

export type DistributionProposal = {
  id: string;
  specializationId: string;
  studentEmailNorm: string;
  contractorEmailNorm: string;
  note: string;
  createdAt: string;
  status: "proposed";
};

export type SpecializationMember = {
  emailNorm: string;
  profile: ProfileSettingsData;
  createdAt: string;
  roleKind: "student" | "contractor";
};

export type SpecializationBucket = {
  specialization: Specialization;
  students: SpecializationMember[];
  contractors: SpecializationMember[];
  unassignedStudents: SpecializationMember[];
  unassignedContractors: SpecializationMember[];
};

const DEFAULT_SPECIALIZATIONS: Specialization[] = [
  { id: "spec-geodesy", title: "Геодезия", sortOrder: 10, active: true },
  { id: "spec-survey", title: "Изыскания", sortOrder: 20, active: true },
  { id: "spec-design", title: "Проектирование", sortOrder: 30, active: true },
  { id: "spec-construction", title: "Строительство", sortOrder: 40, active: true },
  { id: "spec-operation", title: "Эксплуатация", sortOrder: 50, active: true },
  { id: "spec-estimate", title: "Сметное дело", sortOrder: 60, active: true },
  { id: "spec-maintenance", title: "Содержание", sortOrder: 70, active: true },
];

function newId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseSpecs(raw: string | null): Specialization[] | null {
  if (raw === null) return null;
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter((x): x is Specialization => {
        if (!x || typeof x !== "object") return false;
        const o = x as Specialization;
        return typeof o.id === "string" && typeof o.title === "string";
      })
      .map((s) => ({
        id: s.id,
        title: s.title.trim(),
        sortOrder: Number(s.sortOrder) || 0,
        active: s.active !== false,
      }))
      .filter((s) => s.title.length > 0);
  } catch {
    return [];
  }
}

export function loadSpecializations(): Specialization[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = parseSpecs(raw);
    if (parsed === null) {
      saveSpecializations([...DEFAULT_SPECIALIZATIONS]);
      return [...DEFAULT_SPECIALIZATIONS];
    }
    return [...parsed].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru"));
  } catch {
    return [...DEFAULT_SPECIALIZATIONS];
  }
}

export function loadActiveSpecializations(): Specialization[] {
  return loadSpecializations().filter((s) => s.active);
}

export function saveSpecializations(list: Specialization[]): void {
  const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru"));
  pushPortalKv(PORTAL_KV.SPECIALIZATIONS, sorted);
  window.dispatchEvent(new CustomEvent("trassa-specializations-changed"));
}

export function getSpecializationById(id: string): Specialization | undefined {
  return loadSpecializations().find((s) => s.id === id);
}

export function addSpecialization(title: string): { ok: true; item: Specialization } | { ok: false; error: string } {
  const t = title.replace(/\s+/g, " ").trim();
  if (!t) return { ok: false, error: "Введите название спецификации." };
  if (t.length > 120) return { ok: false, error: "Слишком длинное название (макс. 120 символов)." };
  const list = loadSpecializations();
  if (list.some((s) => s.title.toLowerCase() === t.toLowerCase())) {
    return { ok: false, error: "Такая спецификация уже есть." };
  }
  const maxOrder = list.reduce((m, s) => Math.max(m, s.sortOrder), 0);
  const item: Specialization = { id: newId("spec"), title: t, sortOrder: maxOrder + 10, active: true };
  saveSpecializations([...list, item]);
  return { ok: true, item };
}

export function updateSpecialization(
  id: string,
  patch: Partial<Pick<Specialization, "title" | "sortOrder" | "active">>
): { ok: true } | { ok: false; error: string } {
  const list = loadSpecializations();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return { ok: false, error: "Спецификация не найдена." };
  const cur = list[idx];
  const title = patch.title !== undefined ? patch.title.replace(/\s+/g, " ").trim() : cur.title;
  if (!title) return { ok: false, error: "Название не может быть пустым." };
  if (
    list.some((s) => s.id !== id && s.title.toLowerCase() === title.toLowerCase())
  ) {
    return { ok: false, error: "Спецификация с таким названием уже есть." };
  }
  list[idx] = {
    ...cur,
    title,
    sortOrder: patch.sortOrder ?? cur.sortOrder,
    active: patch.active ?? cur.active,
  };
  saveSpecializations(list);
  return { ok: true };
}

export function removeSpecialization(id: string): void {
  saveSpecializations(loadSpecializations().filter((s) => s.id !== id));
}

export function isStudentProfile(profile: ProfileSettingsData): boolean {
  return profile.roleLabel.trim().toLowerCase().includes("студент");
}

export function isContractorProfile(profile: ProfileSettingsData): boolean {
  const label = profile.roleLabel.trim().toLowerCase();
  return label.includes("подряд") || Boolean(profile.contractorCompanyName.trim());
}

export function isDistributionParticipant(profile: ProfileSettingsData): boolean {
  return isStudentProfile(profile) || isContractorProfile(profile);
}

export function listDistributionUsers(users: LocalUserRecord[] = listRegisteredUsers()): {
  students: SpecializationMember[];
  contractors: SpecializationMember[];
} {
  const students: SpecializationMember[] = [];
  const contractors: SpecializationMember[] = [];
  for (const u of users) {
    const label = u.profile.roleLabel.trim().toLowerCase();
    if (label.includes("студент")) {
      students.push({
        emailNorm: u.emailNorm,
        profile: u.profile,
        createdAt: u.createdAt,
        roleKind: "student",
      });
    } else if (label.includes("подряд") || u.profile.contractorCompanyName.trim()) {
      contractors.push({
        emailNorm: u.emailNorm,
        profile: u.profile,
        createdAt: u.createdAt,
        roleKind: "contractor",
      });
    }
  }
  return { students, contractors };
}

export function buildSpecializationBuckets(
  users: LocalUserRecord[] = listRegisteredUsers()
): SpecializationBucket[] {
  const specs = loadSpecializations();
  const { students, contractors } = listDistributionUsers(users);
  const unassignedStudents = students.filter((s) => !s.profile.specializationId?.trim());
  const unassignedContractors = contractors.filter((c) => !c.profile.specializationId?.trim());

  return specs.map((specialization) => ({
    specialization,
    students: students.filter((s) => s.profile.specializationId === specialization.id),
    contractors: contractors.filter((c) => c.profile.specializationId === specialization.id),
    unassignedStudents,
    unassignedContractors,
  }));
}

function readProposals(): DistributionProposal[] {
  try {
    const raw = localStorage.getItem(PROPOSALS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as { proposals?: DistributionProposal[] };
    return Array.isArray(data?.proposals) ? data.proposals : [];
  } catch {
    return [];
  }
}

function writeProposals(proposals: DistributionProposal[]): void {
  try {
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify({ proposals: proposals.slice(-500) }));
    pushPortalKv(PORTAL_KV.DISTRIBUTION_PROPOSALS, proposals.slice(-500));
  } catch {
    /* ignore */
  }
}

export function loadDistributionProposals(): DistributionProposal[] {
  return readProposals().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addDistributionProposal(input: {
  specializationId: string;
  studentEmailNorm: string;
  contractorEmailNorm: string;
  note?: string;
}): DistributionProposal {
  const entry: DistributionProposal = {
    id: newId("prop"),
    specializationId: input.specializationId,
    studentEmailNorm: input.studentEmailNorm.trim().toLowerCase(),
    contractorEmailNorm: input.contractorEmailNorm.trim().toLowerCase(),
    note: (input.note ?? "").trim().slice(0, 300),
    createdAt: new Date().toISOString(),
    status: "proposed",
  };
  writeProposals([entry, ...readProposals()]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trassa-distribution-proposals-changed"));
  }
  return entry;
}

export function specializationTitle(id: string | undefined): string {
  if (!id) return "—";
  return getSpecializationById(id)?.title ?? id;
}
