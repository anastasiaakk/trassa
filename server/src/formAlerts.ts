import { db } from "./db.js";
import { PORTAL_KEYS } from "./portalKeys.js";
import type { AdminFormsStore } from "./formsStore.js";
import { buildMonitoringRows } from "./formsStore.js";

export type FormAlert = {
  id: string;
  audience: "contractor" | "rador";
  emailNorm?: string;
  templateId: string;
  templateTitle: string;
  kind: string;
  message: string;
  createdAt: string;
  read: boolean;
  dueAt?: string | null;
  snapshotId?: string;
};

type AlertsStore = { version: 1; alerts: FormAlert[] };

const MAX = 400;
const SOON_MS = 24 * 60 * 60 * 1000;

function newId(): string {
  return `falert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readAlerts(): AlertsStore {
  const row = db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(PORTAL_KEYS.FORM_ALERTS) as
    | { value_json: string }
    | undefined;
  if (!row) return { version: 1, alerts: [] };
  try {
    const data = JSON.parse(row.value_json) as AlertsStore;
    return { version: 1, alerts: Array.isArray(data.alerts) ? data.alerts : [] };
  } catch {
    return { version: 1, alerts: [] };
  }
}

function writeAlerts(store: AlertsStore): void {
  const trimmed = { version: 1 as const, alerts: store.alerts.slice(0, MAX) };
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO portal_kv (key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, 'system')
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(PORTAL_KEYS.FORM_ALERTS, JSON.stringify(trimmed), now);
}

function dedupeKey(a: FormAlert): string {
  return `${a.kind}:${a.templateId}:${a.emailNorm ?? "rador"}:${a.snapshotId ?? ""}`;
}

function hasAlert(alerts: FormAlert[], kind: string, templateId: string, emailNorm?: string, snapshotId?: string): boolean {
  return alerts.some(
    (a) =>
      a.kind === kind &&
      a.templateId === templateId &&
      (a.emailNorm ?? "") === (emailNorm ?? "") &&
      (a.snapshotId ?? "") === (snapshotId ?? "")
  );
}

function pushAlert(store: AlertsStore, alert: Omit<FormAlert, "id" | "createdAt" | "read">): void {
  const draft: FormAlert = {
    ...alert,
    id: newId(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  if (store.alerts.some((a) => dedupeKey(a) === dedupeKey(draft))) return;
  store.alerts.unshift(draft);
}

export function processFormAlerts(store: AdminFormsStore): void {
  const alerts = readAlerts();
  const now = Date.now();

  for (const snap of store.snapshots) {
    if (hasAlert(alerts.alerts, "rador_snapshot", snap.templateId, undefined, snap.id)) continue;
    pushAlert(alerts, {
      audience: "rador",
      templateId: snap.templateId,
      templateTitle: snap.templateTitle,
      kind: "rador_snapshot",
      message: `Срез по сроку «${snap.templateTitle}»: средний заполнения ${snap.summary.avgFillPercent}%, сдано ${snap.summary.submitted} из ${snap.summary.contractors}.`,
      dueAt: snap.dueAt,
      snapshotId: snap.id,
    });
  }

  for (const template of store.templates) {
    if (!template.deadlineAt || !template.active) continue;
    const dueMs = new Date(template.deadlineAt).getTime();
    const assignments = store.assignments.filter((a) => a.templateId === template.id);

    for (const asgn of assignments) {
      const rows = buildMonitoringRows(store, template.id);
      const row = rows.find((r) => r.contractorEmailNorm === asgn.contractorEmailNorm);
      const fill = row?.fillPercent ?? 0;
      const submitted = row?.submitted ?? false;

      if (dueMs > now && dueMs - now <= SOON_MS && !submitted && fill < 100) {
        if (
          !hasAlert(
            alerts.alerts,
            "contractor_deadline_soon",
            template.id,
            asgn.contractorEmailNorm
          )
        ) {
          pushAlert(alerts, {
            audience: "contractor",
            emailNorm: asgn.contractorEmailNorm,
            templateId: template.id,
            templateTitle: template.title,
            kind: "contractor_deadline_soon",
            message: `До срока сдачи таблицы «${template.title}» осталось менее 24 часов. Заполнено ${fill}%.`,
            dueAt: template.deadlineAt,
          });
        }
      }

      if (dueMs <= now && !submitted) {
        if (
          !hasAlert(alerts.alerts, "contractor_deadline_due", template.id, asgn.contractorEmailNorm)
        ) {
          pushAlert(alerts, {
            audience: "contractor",
            emailNorm: asgn.contractorEmailNorm,
            templateId: template.id,
            templateTitle: template.title,
            kind: "contractor_deadline_due",
            message: `Срок сдачи таблицы «${template.title}» наступил. Заполнено ${fill}%. Отправьте данные или свяжитесь с администратором.`,
            dueAt: template.deadlineAt,
          });
        }
      }
    }
  }

  writeAlerts(alerts);
}

export function loadAlertsPublic(): AlertsStore {
  return readAlerts();
}

export function notifyContractorAssigned(
  template: { id: string; title: string; deadlineAt: string | null },
  emailNorm: string
): void {
  const alerts = readAlerts();
  if (
    hasAlert(alerts.alerts, "contractor_assigned", template.id, emailNorm)
  ) {
    return;
  }
  pushAlert(alerts, {
    audience: "contractor",
    emailNorm,
    templateId: template.id,
    templateTitle: template.title,
    kind: "contractor_assigned",
    message: `Вам назначена таблица «${template.title}»${
      template.deadlineAt
        ? ` — срок ${new Date(template.deadlineAt).toLocaleString("ru-RU")}`
        : ""
    }.`,
    dueAt: template.deadlineAt,
  });
  writeAlerts(alerts);
}

export function markAlertRead(id: string): boolean {
  const store = readAlerts();
  const idx = store.alerts.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  store.alerts[idx] = { ...store.alerts[idx], read: true };
  writeAlerts(store);
  return true;
}
