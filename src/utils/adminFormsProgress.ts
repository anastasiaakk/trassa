import type {
  FormColumn,
  FormMonitoringRow,
  FormSubmission,
  FormTemplate,
} from "../types/adminForms";
import { submissionFillPercent } from "./adminFormsGrid";

function isFilled(value: unknown, col: FormColumn): boolean {
  if (value === undefined || value === null) return false;
  if (col.type === "checkbox") return value === true;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

export function computeFillPercent(columns: FormColumn[], cells: Record<string, unknown>): number {
  const required = columns.filter((c) => c.required !== false);
  const pool = required.length > 0 ? required : columns;
  if (pool.length === 0) return 100;
  const filled = pool.filter((c) => isFilled(cells[c.id], c)).length;
  return Math.round((filled / pool.length) * 100);
}

export function buildMonitoringRows(input: {
  template: FormTemplate;
  assignments: { contractorEmailNorm: string; contractorLabel: string }[];
  submissions: FormSubmission[];
  now?: Date;
}): FormMonitoringRow[] {
  const now = input.now ?? new Date();
  const dueMs = input.template.deadlineAt ? new Date(input.template.deadlineAt).getTime() : null;
  const overdue = dueMs !== null && now.getTime() > dueMs;

  return input.assignments.map((a) => {
    const sub = input.submissions.find(
      (s) =>
        s.templateId === input.template.id && s.contractorEmailNorm === a.contractorEmailNorm
    );
    const fillPercent = sub
      ? submissionFillPercent(input.template, sub)
      : submissionFillPercent(input.template, { cells: {}, rows: input.template.seedRows });
    return {
      templateId: input.template.id,
      templateTitle: input.template.title,
      contractorEmailNorm: a.contractorEmailNorm,
      contractorLabel: a.contractorLabel,
      fillPercent,
      submitted: Boolean(sub?.submittedAt),
      dueAt: input.template.deadlineAt,
      overdue,
    };
  });
}
