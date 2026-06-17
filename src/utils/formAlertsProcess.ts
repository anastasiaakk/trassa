import type { AdminFormsStore } from "../types/adminForms";
import { buildMonitoringRows } from "./adminFormsProgress";
import { pushFormAlert } from "./formAlertsStorage";

const SOON_MS = 24 * 60 * 60 * 1000;

/** Локальная обработка уведомлений (зеркало серверной логики). */
export function processFormAlertsLocal(store: AdminFormsStore): AdminFormsStore {
  const now = Date.now();

  for (const snap of store.snapshots) {
    pushFormAlert({
      audience: "rador",
      templateId: snap.templateId,
      templateTitle: snap.templateTitle,
      kind: "rador_snapshot",
      message: `Срез «${snap.templateTitle}»: средний % ${snap.summary.avgFillPercent}, сдано ${snap.summary.submitted}/${snap.summary.contractors}.`,
      dueAt: snap.dueAt,
      snapshotId: snap.id,
      dedupeKey: `rador_snapshot:${snap.templateId}::${snap.id}`,
    });
  }

  for (const template of store.templates) {
    if (!template.deadlineAt || !template.active) continue;
    const dueMs = new Date(template.deadlineAt).getTime();
    const assignments = store.assignments.filter((a) => a.templateId === template.id);

    for (const asgn of assignments) {
      const rows = buildMonitoringRows({
        template,
        assignments: [{ contractorEmailNorm: asgn.contractorEmailNorm, contractorLabel: asgn.contractorEmailNorm }],
        submissions: store.submissions,
      });
      const row = rows[0];
      const fill = row?.fillPercent ?? 0;
      const submitted = row?.submitted ?? false;

      if (dueMs > now && dueMs - now <= SOON_MS && !submitted && fill < 100) {
        pushFormAlert({
          audience: "contractor",
          emailNorm: asgn.contractorEmailNorm,
          templateId: template.id,
          templateTitle: template.title,
          kind: "contractor_deadline_soon",
          message: `До срока «${template.title}» менее 24 ч. Заполнено ${fill}%.`,
          dueAt: template.deadlineAt,
          dedupeKey: `contractor_deadline_soon:${template.id}:${asgn.contractorEmailNorm}:`,
        });
      }

      if (dueMs <= now && !submitted) {
        pushFormAlert({
          audience: "contractor",
          emailNorm: asgn.contractorEmailNorm,
          templateId: template.id,
          templateTitle: template.title,
          kind: "contractor_deadline_due",
          message: `Срок «${template.title}» наступил. Заполнено ${fill}%.`,
          dueAt: template.deadlineAt,
          dedupeKey: `contractor_deadline_due:${template.id}:${asgn.contractorEmailNorm}:`,
        });
      }
    }
  }

  return store;
}
