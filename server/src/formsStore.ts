import { db } from "./db.js";
import { PORTAL_KEYS } from "./portalKeys.js";
import { processFormAlerts } from "./formAlerts.js";
import { submissionFillPercent } from "./formsProgress.js";

export type FormColumn = {
  id: string;
  title: string;
  type: "text" | "number" | "date" | "select" | "checkbox" | "percent";
  required?: boolean;
  options?: string[];
  hint?: string;
};

export type FormGridRow = { id: string; cells: Record<string, unknown> };
export type FormTemplateSheet = {
  id: string;
  title: string;
  columns: FormColumn[];
  seedRows?: FormGridRow[];
  layout?: "form" | "grid";
};

export type FormTemplate = {
  id: string;
  title: string;
  description: string;
  columns: FormColumn[];
  layout?: "form" | "grid";
  seedRows?: FormGridRow[];
  deadlineAt: string | null;
  active: boolean;
  aiFillHints: string;
  /** Кто создал шаблон (для фильтра в админке / РАДОР). */
  owner?: "admin" | "rador";
  ownerLabel?: string;
  importSheets?: FormTemplateSheet[];
  createdAt: string;
  updatedAt: string;
};

export type FormMonitoringRow = {
  templateId: string;
  templateTitle: string;
  contractorEmailNorm: string;
  contractorLabel: string;
  fillPercent: number;
  submitted: boolean;
  dueAt: string | null;
  overdue: boolean;
};

export type FormDeadlineSnapshot = {
  id: string;
  templateId: string;
  templateTitle: string;
  dueAt: string;
  capturedAt: string;
  rows: FormMonitoringRow[];
  summary: { contractors: number; submitted: number; avgFillPercent: number };
};

export type AdminFormsStore = {
  version: 1;
  templates: FormTemplate[];
  assignments: Array<{ id: string; templateId: string; contractorEmailNorm: string; assignedAt: string }>;
  submissions: Array<{
    id: string;
    templateId: string;
    contractorEmailNorm: string;
    cells: Record<string, unknown>;
    rows?: FormGridRow[];
    sheets?: Record<string, { cells: Record<string, unknown>; rows?: FormGridRow[] }>;
    updatedAt: string;
    submittedAt: string | null;
  }>;
  snapshots: FormDeadlineSnapshot[];
};

const EMPTY: AdminFormsStore = {
  version: 1,
  templates: [],
  assignments: [],
  submissions: [],
  snapshots: [],
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readKv<T>(key: string): T | null {
  const row = db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(key) as
    | { value_json: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

function writeKv(key: string, value: unknown, by = "admin"): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO portal_kv (key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value), now, by);
}

function contractorLabel(emailNorm: string): string {
  const row = db
    .prepare("SELECT profile_json FROM users WHERE email_norm = ?")
    .get(emailNorm) as { profile_json: string } | undefined;
  if (!row) return emailNorm;
  try {
    const p = JSON.parse(row.profile_json) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      contractorCompanyName?: string;
    };
    const name = `${p.lastName ?? ""} ${p.firstName ?? ""}`.trim();
    return name || p.email || p.contractorCompanyName || emailNorm;
  } catch {
    return emailNorm;
  }
}

export function buildMonitoringRows(store: AdminFormsStore, templateId: string): FormMonitoringRow[] {
  const template = store.templates.find((t) => t.id === templateId);
  if (!template) return [];
  const now = Date.now();
  const dueMs = template.deadlineAt ? new Date(template.deadlineAt).getTime() : null;
  const overdue = dueMs !== null && now > dueMs;

  return store.assignments
    .filter((a) => a.templateId === templateId)
    .map((a) => {
      const sub = store.submissions.find(
        (s) => s.templateId === templateId && s.contractorEmailNorm === a.contractorEmailNorm
      );
      return {
        templateId,
        templateTitle: template.title,
        contractorEmailNorm: a.contractorEmailNorm,
        contractorLabel: contractorLabel(a.contractorEmailNorm),
        fillPercent: submissionFillPercent(
          template,
          sub ?? { cells: {}, rows: template.seedRows }
        ),
        submitted: Boolean(sub?.submittedAt),
        dueAt: template.deadlineAt,
        overdue,
      };
    });
}

export function buildAllMonitoring(store: AdminFormsStore): FormMonitoringRow[] {
  return store.templates.flatMap((t) => buildMonitoringRows(store, t.id));
}

function captureDueSnapshots(store: AdminFormsStore): AdminFormsStore {
  const now = Date.now();
  let changed = false;
  const next = { ...store, snapshots: [...store.snapshots] };

  for (const template of store.templates) {
    if (!template.deadlineAt) continue;
    const dueAt = template.deadlineAt;
    if (new Date(dueAt).getTime() > now) continue;
    if (next.snapshots.some((s) => s.templateId === template.id && s.dueAt === dueAt)) continue;

    const rows = buildMonitoringRows(next, template.id);
    const avg =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.fillPercent, 0) / rows.length)
        : 0;
    next.snapshots.unshift({
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
    });
    changed = true;
  }
  return changed ? next : store;
}

function publishRadorDashboard(store: AdminFormsStore): void {
  writeKv(
    PORTAL_KEYS.FORM_RADOR_MONITORING,
    {
      updatedAt: new Date().toISOString(),
      snapshots: store.snapshots.slice(0, 80),
      monitoring: buildAllMonitoring(store),
      templates: store.templates.map((t) => ({
        id: t.id,
        title: t.title,
        deadlineAt: t.deadlineAt,
      })),
    },
    "system"
  );
}

export function loadFormsStore(): AdminFormsStore {
  const raw = readKv<AdminFormsStore>(PORTAL_KEYS.ADMIN_FORMS);
  if (!raw || raw.version !== 1) return { ...EMPTY };
  return {
    version: 1,
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    assignments: Array.isArray(raw.assignments) ? raw.assignments : [],
    submissions: Array.isArray(raw.submissions) ? raw.submissions : [],
    snapshots: Array.isArray(raw.snapshots) ? raw.snapshots : [],
  };
}

export function saveFormsStore(store: AdminFormsStore, updatedBy = "admin"): AdminFormsStore {
  const next = captureDueSnapshots(store);
  writeKv(PORTAL_KEYS.ADMIN_FORMS, next, updatedBy);
  publishRadorDashboard(next);
  processFormAlerts(next);
  return next;
}

export function parseHeadersToColumns(headers: string[]): FormColumn[] {
  return headers.map((h, i) => ({
    id: `col-${i + 1}`,
    title: (h.trim() || `Столбец ${i + 1}`).slice(0, 120),
    type: "text" as const,
    required: false,
  }));
}

export function createImportedTemplate(
  title: string,
  columns: FormColumn[],
  seedRows?: FormGridRow[]
): FormTemplate {
  const now = new Date().toISOString();
  const grid = (seedRows?.length ?? 0) > 0;
  return {
    id: newId("form"),
    title: title.trim().slice(0, 120) || "Импортированная таблица",
    description: grid
      ? "Создано из импорта файла (таблица с данными)"
      : "Создано из импорта файла",
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

export function assignTemplateToContractors(
  store: AdminFormsStore,
  templateId: string,
  contractorEmailNorms: string[]
): { store: AdminFormsStore; added: number; addedEmails: string[] } {
  const template = store.templates.find((t) => t.id === templateId);
  if (!template) return { store, added: 0, addedEmails: [] };

  const existing = new Set(
    store.assignments
      .filter((a) => a.templateId === templateId)
      .map((a) => a.contractorEmailNorm)
  );
  const now = new Date().toISOString();
  const addedEmails: string[] = [];

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
    addedEmails.push(norm);
  }

  return { store, added: addedEmails.length, addedEmails };
}
