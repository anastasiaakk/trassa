import { PORTAL_KV, PORTAL_LOCAL_KEYS } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";
import type {
  AdminFormsStore,
  FormAssignment,
  FormDeadlineSnapshot,
  FormGridRow,
  FormSubmission,
  FormTemplate,
} from "../types/adminForms";
import { buildMonitoringRows } from "./adminFormsProgress";
import { initialSubmissionRows, rowFromImportValues, templateLayout } from "./adminFormsGrid";
import { pushFormAlert } from "./formAlertsStorage";
import { processFormAlertsLocal } from "./formAlertsProcess";
import { listRegisteredUsers } from "./localAuth";

const STORAGE_KEY = "trassa-admin-forms-v1";
/** Срезы для кабинета РАДОР (не админ-only). */
export const RADOR_MONITORING_LOCAL_KEY = "trassa-form-rador-monitoring-v1";

const EMPTY: AdminFormsStore = {
  version: 1,
  templates: [],
  assignments: [],
  submissions: [],
  snapshots: [],
};

function newId(prefix: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseStore(raw: string | null): AdminFormsStore {
  if (!raw) return { ...EMPTY };
  try {
    const data = JSON.parse(raw) as Partial<AdminFormsStore>;
    if (data.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      templates: Array.isArray(data.templates) ? data.templates : [],
      assignments: Array.isArray(data.assignments) ? data.assignments : [],
      submissions: Array.isArray(data.submissions) ? data.submissions : [],
      snapshots: Array.isArray(data.snapshots) ? data.snapshots : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function loadAdminFormsStore(): AdminFormsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return captureDueSnapshots(parseStore(raw));
  } catch {
    return { ...EMPTY };
  }
}

function publishRadorMonitoring(store: AdminFormsStore): void {
  try {
    localStorage.setItem(
      RADOR_MONITORING_LOCAL_KEY,
      JSON.stringify({
        updatedAt: new Date().toISOString(),
        snapshots: store.snapshots.slice(0, 80),
        templates: store.templates.map((t) => ({
          id: t.id,
          title: t.title,
          deadlineAt: t.deadlineAt,
        })),
      })
    );
    window.dispatchEvent(new CustomEvent("trassa-rador-forms-monitoring-changed"));
  } catch {
    /* ignore */
  }
}

export function loadRadorFormsMonitoring(): {
  updatedAt: string;
  snapshots: AdminFormsStore["snapshots"];
  monitoring?: import("../types/adminForms").FormMonitoringRow[];
  templates: Array<{ id: string; title: string; deadlineAt: string | null }>;
} | null {
  try {
    const portalRaw = localStorage.getItem(PORTAL_LOCAL_KEYS[PORTAL_KV.FORM_RADOR_MONITORING]);
    if (portalRaw) {
      const data = JSON.parse(portalRaw) as {
        updatedAt?: string;
        snapshots?: AdminFormsStore["snapshots"];
        monitoring?: import("../types/adminForms").FormMonitoringRow[];
        templates?: Array<{ id: string; title: string; deadlineAt: string | null }>;
      };
      return {
        updatedAt: data.updatedAt ?? new Date().toISOString(),
        snapshots: data.snapshots ?? [],
        monitoring: data.monitoring,
        templates: data.templates ?? [],
      };
    }
    const raw = localStorage.getItem(RADOR_MONITORING_LOCAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      updatedAt: string;
      snapshots: AdminFormsStore["snapshots"];
      templates: Array<{ id: string; title: string; deadlineAt: string | null }>;
    };
  } catch {
    return null;
  }
}

export function saveAdminFormsStore(store: AdminFormsStore): void {
  const next = processFormAlertsLocal(captureDueSnapshots(store));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  pushPortalKv(PORTAL_KV.ADMIN_FORMS, next);
  publishRadorMonitoring(next);
  window.dispatchEvent(new CustomEvent("trassa-admin-forms-changed"));
}

export function getFormTemplate(id: string): FormTemplate | undefined {
  return loadAdminFormsStore().templates.find((t) => t.id === id);
}

export function upsertFormTemplate(
  patch: Omit<FormTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string }
): FormTemplate {
  const store = loadAdminFormsStore();
  const now = new Date().toISOString();
  if (patch.id) {
    const idx = store.templates.findIndex((t) => t.id === patch.id);
    if (idx >= 0) {
      const cur = store.templates[idx];
      const item: FormTemplate = {
        ...cur,
        ...patch,
        id: cur.id,
        createdAt: cur.createdAt,
        updatedAt: now,
      };
      store.templates[idx] = item;
      saveAdminFormsStore(store);
      return item;
    }
  }
  const item: FormTemplate = {
    id: newId("form"),
    title: patch.title.trim(),
    description: patch.description.trim(),
    columns: patch.columns,
    layout: patch.layout,
    seedRows: patch.seedRows,
    deadlineAt: patch.deadlineAt,
    active: patch.active,
    aiFillHints: patch.aiFillHints.trim(),
    owner: patch.owner,
    ownerLabel: patch.ownerLabel,
    importSheets: patch.importSheets,
    createdAt: now,
    updatedAt: now,
  };
  store.templates.push(item);
  saveAdminFormsStore(store);
  return item;
}

export function removeFormTemplate(id: string): void {
  const store = loadAdminFormsStore();
  store.templates = store.templates.filter((t) => t.id !== id);
  store.assignments = store.assignments.filter((a) => a.templateId !== id);
  store.submissions = store.submissions.filter((s) => s.templateId !== id);
  store.snapshots = store.snapshots.filter((s) => s.templateId !== id);
  saveAdminFormsStore(store);
}

export function assignTemplateToContractors(
  templateId: string,
  contractorEmailNorms: string[]
): void {
  const store = loadAdminFormsStore();
  const existing = new Set(
    store.assignments
      .filter((a) => a.templateId === templateId)
      .map((a) => a.contractorEmailNorm)
  );
  const now = new Date().toISOString();
  const template = store.templates.find((t) => t.id === templateId);
  for (const email of contractorEmailNorms) {
    const norm = email.trim().toLowerCase();
    if (!norm || existing.has(norm)) continue;
    store.assignments.push({
      id: newId("asgn"),
      templateId,
      contractorEmailNorm: norm,
      assignedAt: now,
    });
    existing.add(norm);
    if (template) {
      pushFormAlert({
        audience: "contractor",
        emailNorm: norm,
        templateId,
        templateTitle: template.title,
        kind: "contractor_assigned",
        message: `Вам назначена таблица «${template.title}»${template.deadlineAt ? ` — срок ${new Date(template.deadlineAt).toLocaleString("ru-RU")}` : ""}.`,
        dueAt: template.deadlineAt,
        dedupeKey: `contractor_assigned:${templateId}:${norm}:`,
      });
    }
  }
  saveAdminFormsStore(store);
}

export function listContractorAssignments(emailNorm: string): FormAssignment[] {
  const norm = emailNorm.trim().toLowerCase();
  return loadAdminFormsStore().assignments.filter((a) => a.contractorEmailNorm === norm);
}

export function getOrCreateSubmission(templateId: string, contractorEmailNorm: string): FormSubmission {
  const store = loadAdminFormsStore();
  const norm = contractorEmailNorm.trim().toLowerCase();
  const found = store.submissions.find(
    (s) => s.templateId === templateId && s.contractorEmailNorm === norm
  );
  if (found) return found;
  const template = store.templates.find((t) => t.id === templateId);
  const item: FormSubmission = {
    id: newId("sub"),
    templateId,
    contractorEmailNorm: norm,
    cells: {},
    rows: template && templateLayout(template) === "grid" ? initialSubmissionRows(template) : undefined,
    updatedAt: new Date().toISOString(),
    submittedAt: null,
  };
  store.submissions.push(item);
  saveAdminFormsStore(store);
  return item;
}

export function saveFormSubmission(
  templateId: string,
  contractorEmailNorm: string,
  payload: {
    cells: FormSubmission["cells"];
    rows?: FormGridRow[];
    sheets?: FormSubmission["sheets"];
  },
  submit: boolean
): FormSubmission {
  const store = loadAdminFormsStore();
  const norm = contractorEmailNorm.trim().toLowerCase();
  const idx = store.submissions.findIndex(
    (s) => s.templateId === templateId && s.contractorEmailNorm === norm
  );
  const now = new Date().toISOString();
  if (idx >= 0) {
    const cur = store.submissions[idx];
    const item: FormSubmission = {
      ...cur,
      cells: payload.cells,
      rows: payload.rows ?? cur.rows,
      sheets: payload.sheets ?? cur.sheets,
      updatedAt: now,
      submittedAt: submit ? now : cur.submittedAt,
    };
    store.submissions[idx] = item;
    saveAdminFormsStore(store);
    return item;
  }
  const template = store.templates.find((t) => t.id === templateId);
  const item: FormSubmission = {
    id: newId("sub"),
    templateId,
    contractorEmailNorm: norm,
    cells: payload.cells,
    rows:
      payload.rows ??
      (template && templateLayout(template) === "grid" ? initialSubmissionRows(template) : undefined),
    sheets: payload.sheets,
    updatedAt: now,
    submittedAt: submit ? now : null,
  };
  store.submissions.push(item);
  saveAdminFormsStore(store);
  return item;
}

function contractorLabel(emailNorm: string): string {
  const u = listRegisteredUsers().find((x) => x.emailNorm === emailNorm);
  if (!u) return emailNorm;
  const name = `${u.profile.lastName} ${u.profile.firstName}`.trim();
  return name || u.profile.email || emailNorm;
}

export function listMonitoringForTemplate(templateId: string) {
  const store = loadAdminFormsStore();
  const template = store.templates.find((t) => t.id === templateId);
  if (!template) return [];
  const assignments = store.assignments
    .filter((a) => a.templateId === templateId)
    .map((a) => ({
      contractorEmailNorm: a.contractorEmailNorm,
      contractorLabel: contractorLabel(a.contractorEmailNorm),
    }));
  return buildMonitoringRows({
    template,
    assignments,
    submissions: store.submissions,
  });
}

export function listAllMonitoring() {
  const store = loadAdminFormsStore();
  return store.templates.flatMap((t) => listMonitoringForTemplate(t.id));
}

function captureDueSnapshots(store: AdminFormsStore): AdminFormsStore {
  const now = Date.now();
  let changed = false;
  const next = { ...store, snapshots: [...store.snapshots] };

  for (const template of store.templates) {
    if (!template.deadlineAt) continue;
    const dueAt = template.deadlineAt;
    const dueMs = new Date(dueAt).getTime();
    if (dueMs > now) continue;
    const exists = next.snapshots.some(
      (s) => s.templateId === template.id && s.dueAt === dueAt
    );
    if (exists) continue;

    const rows = listMonitoringForTemplate(template.id);
    const avg =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.fillPercent, 0) / rows.length)
        : 0;
    const snapshot: FormDeadlineSnapshot = {
      id: newId("snap"),
      templateId: template.id,
      templateTitle: template.title,
      dueAt,
      capturedAt: new Date().toISOString(),
      rows,
      summary: {
        contractors: rows.length,
        submitted: rows.filter((r) => r.submitted).length,
        avgFillPercent: avg,
      },
    };
    next.snapshots.unshift(snapshot);
    changed = true;
  }

  if (!changed) return store;
  return next;
}

/** Парсинг CSV (разделитель ; или ,) в шаблон таблицы */
function cleanCsvCell(cell: string): string {
  return cell.trim().replace(/^\uFEFF/, "").replace(/^"|"$/g, "");
}

function csvTextLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^sep\s*=\s*[^\r\n]+$/i.test(l));
}

export function parseCsvToTemplate(csvText: string, title: string): FormTemplate | null {
  const lines = csvTextLines(csvText);
  if (lines.length < 1) return null;

  const delim = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
  const headerCells = lines[0].split(delim).map(cleanCsvCell);
  const columns = headerCells.map((h, i) => ({
    id: `col-${i + 1}`,
    title: (h || `Столбец ${i + 1}`).slice(0, 120),
    type: "text" as const,
    required: false,
  }));
  if (columns.length === 0) return null;

  const dataLines = lines.slice(1);
  const seedRows: FormGridRow[] = dataLines
    .map((line) => line.split(delim).map(cleanCsvCell))
    .filter((cells) => cells.some((c) => c.length > 0))
    .slice(0, 500)
    .map((cells) => rowFromImportValues(columns, cells));

  const now = new Date().toISOString();
  const grid = seedRows.length > 0;
  return {
    id: newId("form"),
    title: title.trim() || "Импортированная таблица",
    description: grid ? "Создано из импорта CSV (таблица с данными)" : "Создано из импорта CSV",
    columns,
    layout: grid ? "grid" : "form",
    seedRows: grid ? seedRows : undefined,
    deadlineAt: null,
    active: true,
    aiFillHints: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function getFormSubmissionReview(
  templateId: string,
  contractorEmailNorm: string
): { template: FormTemplate; submission: FormSubmission | null } | null {
  const store = loadAdminFormsStore();
  const template = store.templates.find((t) => t.id === templateId);
  if (!template) return null;
  const norm = contractorEmailNorm.trim().toLowerCase();
  const submission =
    store.submissions.find(
      (s) => s.templateId === templateId && s.contractorEmailNorm === norm
    ) ?? null;
  return { template, submission };
}

export function importTemplateFromCsv(
  csvText: string,
  title: string,
  owner: FormTemplate["owner"] = "admin"
): FormTemplate | null {
  const draft = parseCsvToTemplate(csvText, title);
  if (!draft) return null;
  draft.owner = owner;
  draft.ownerLabel = owner === "rador" ? "РАДОР" : "Админ";
  const store = loadAdminFormsStore();
  store.templates.push(draft);
  saveAdminFormsStore(store);
  return draft;
}
