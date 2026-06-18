import type { FormSubmission, FormTemplate } from "../types/adminForms";
import type { CalendarEventItem } from "../pages/AssociationEventsView";
import type { ContractorRecommendation } from "./distributionRecommendations";
import { getContractorSeenAt } from "./distributionRecommendations";
import { submissionFillPercentSingle } from "./adminFormsGrid";

export type ContractorDashboardTab = "home" | "deadlines" | "monitoring";

export type ContractorDeadlineKind = "form" | "letter" | "event";

export type ContractorDeadlineItem = {
  id: string;
  kind: ContractorDeadlineKind;
  title: string;
  meta: string;
  dueAt: string;
  overdue?: boolean;
  urgent?: boolean;
};

export type ContractorFormProgressRow = {
  templateId: string;
  title: string;
  fillPercent: number;
  submitted: boolean;
  dueAt: string | null;
  overdue: boolean;
};

export type ContractorPlannerItem = {
  id: string;
  title: string;
  dueAt: string;
  dateLabel: string;
  done: boolean;
  kind: ContractorDeadlineKind | "custom";
};

export type RadorDeadlineTableRow = {
  templateId: string;
  title: string;
  dueLabel: string;
  dueAt: string | null;
  fillPercent: number;
  status: "submitted" | "in_progress" | "overdue" | "no_deadline";
  statusLabel: string;
};

export type ContractorStudentStatusRow = {
  proposalId: string;
  name: string;
  specializationTitle: string;
  status: "new" | "seen";
  createdAt: string;
};

const PRACTICE_LETTER_DEADLINE = "2026-06-30T23:59:59.000Z";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function daysUntil(iso: string, now = new Date()): number {
  const due = new Date(iso).getTime();
  return Math.ceil((due - now.getTime()) / 86_400_000);
}

export function isRadorFormTemplate(template: FormTemplate): boolean {
  return template.owner === "rador" || /радор/i.test(template.ownerLabel ?? "");
}

function formatPlannerDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

function formatDueLabel(iso: string, now = new Date()): string {
  const d = daysUntil(iso, now);
  const date = new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (d < 0) return `Просрочено · ${date}`;
  if (d === 0) return `Сегодня · ${date}`;
  if (d === 1) return `Завтра · ${date}`;
  if (d <= 7) return `Через ${d} дн. · ${date}`;
  return `До ${date}`;
}

export function buildContractorFormProgress(input: {
  emailNorm: string;
  templates: FormTemplate[];
  submissions: FormSubmission[];
  now?: Date;
}): ContractorFormProgressRow[] {
  const norm = normalizeEmail(input.emailNorm);
  const now = input.now ?? new Date();

  return input.templates.filter((t) => t.active).map((template) => {
    const sub = input.submissions.find(
      (s) => s.templateId === template.id && s.contractorEmailNorm === norm
    );
    const fillPercent = sub
      ? submissionFillPercentSingle(template, sub)
      : submissionFillPercentSingle(template, { cells: {}, rows: template.seedRows });
    const dueMs = template.deadlineAt ? new Date(template.deadlineAt).getTime() : null;
    const overdue = dueMs !== null && now.getTime() > dueMs && !sub?.submittedAt;
    return {
      templateId: template.id,
      title: template.title,
      fillPercent,
      submitted: Boolean(sub?.submittedAt),
      dueAt: template.deadlineAt,
      overdue,
    };
  });
}

export function buildContractorStudentStatuses(
  contractorEmailNorm: string,
  recommendations: ContractorRecommendation[]
): ContractorStudentStatusRow[] {
  const seenAt = getContractorSeenAt(contractorEmailNorm);
  const seenMs = seenAt ? new Date(seenAt).getTime() : null;
  return recommendations
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((row) => {
      const isNew = seenMs === null || new Date(row.createdAt).getTime() > seenMs;
      const name =
        `${row.student.lastName} ${row.student.firstName}`.trim() || row.student.email;
      return {
        proposalId: row.proposalId,
        name,
        specializationTitle: row.specializationTitle,
        status: isNew ? "new" : "seen",
        createdAt: row.createdAt,
      };
    });
}

export function buildContractorDeadlineFeed(input: {
  templates: FormTemplate[];
  submissions: FormSubmission[];
  emailNorm: string;
  events: CalendarEventItem[];
  includePracticeLetter?: boolean;
  now?: Date;
}): ContractorDeadlineItem[] {
  const now = input.now ?? new Date();
  const norm = normalizeEmail(input.emailNorm);
  const items: ContractorDeadlineItem[] = [];

  const progress = buildContractorFormProgress({
    emailNorm: norm,
    templates: input.templates,
    submissions: input.submissions,
    now,
  });

  for (const row of progress) {
    if (!row.dueAt) continue;
    const days = daysUntil(row.dueAt, now);
    items.push({
      id: `form-${row.templateId}`,
      kind: "form",
      title: row.title,
      meta: row.submitted
        ? `Сдано · ${formatDueLabel(row.dueAt, now)}`
        : `Заполнено ${row.fillPercent}% · ${formatDueLabel(row.dueAt, now)}`,
      dueAt: row.dueAt,
      overdue: row.overdue,
      urgent: !row.submitted && days >= 0 && days <= 3,
    });
  }

  if (input.includePracticeLetter !== false) {
    items.push({
      id: "letter-practice-2026",
      kind: "letter",
      title: "Запрос на летнюю практику 2026",
      meta: `Письмо РАДОР · ${formatDueLabel(PRACTICE_LETTER_DEADLINE, now)}`,
      dueAt: PRACTICE_LETTER_DEADLINE,
      urgent: daysUntil(PRACTICE_LETTER_DEADLINE, now) <= 14,
    });
  }

  for (const ev of input.events) {
    const dueAt = `${ev.date}T${ev.time || "12:00"}:00`;
    items.push({
      id: `event-${ev.id}`,
      kind: "event",
      title: ev.title,
      meta: `Мероприятие · ${formatDueLabel(dueAt, now)}`,
      dueAt,
      urgent: daysUntil(dueAt, now) <= 3,
    });
  }

  return items.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export function buildContractorPlannerItems(input: {
  templates: FormTemplate[];
  submissions: FormSubmission[];
  emailNorm: string;
  events: CalendarEventItem[];
  now?: Date;
  limit?: number;
}): ContractorPlannerItem[] {
  const now = input.now ?? new Date();
  const feed = buildContractorDeadlineFeed({
    emailNorm: input.emailNorm,
    templates: input.templates,
    submissions: input.submissions,
    events: input.events,
    now,
  });

  return feed.slice(0, input.limit ?? 8).map((item) => {
    const done =
      item.kind === "form"
        ? item.meta.startsWith("Сдано")
        : new Date(item.dueAt).getTime() < now.getTime();
    return {
      id: item.id,
      title: item.title,
      dueAt: item.dueAt,
      dateLabel: formatPlannerDate(item.dueAt),
      done,
      kind: item.kind,
    };
  });
}

export function buildRadorFormDeadlineRows(input: {
  emailNorm: string;
  templates: FormTemplate[];
  submissions: FormSubmission[];
  now?: Date;
}): RadorDeadlineTableRow[] {
  const now = input.now ?? new Date();
  const radorTemplates = input.templates.filter((t) => t.active && isRadorFormTemplate(t));
  const progress = buildContractorFormProgress({
    emailNorm: input.emailNorm,
    templates: radorTemplates,
    submissions: input.submissions,
    now,
  });

  return progress
    .map((row) => {
      let status: RadorDeadlineTableRow["status"] = "in_progress";
      let statusLabel = "В работе";
      if (row.submitted) {
        status = "submitted";
        statusLabel = "Сдано";
      } else if (row.overdue) {
        status = "overdue";
        statusLabel = "Просрочено";
      } else if (!row.dueAt) {
        status = "no_deadline";
        statusLabel = "Без срока";
      }

      const dueLabel = row.dueAt
        ? new Date(row.dueAt).toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "—";

      return {
        templateId: row.templateId,
        title: row.title,
        dueLabel,
        dueAt: row.dueAt,
        fillPercent: row.fillPercent,
        status,
        statusLabel,
      };
    })
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return a.title.localeCompare(b.title, "ru");
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
}

export function buildContractorMonitoringKpis(input: {
  formProgress: ContractorFormProgressRow[];
  recommendations: ContractorRecommendation[];
  recommendationsUnread: number;
  eventsCount: number;
  deadlinesSoon: number;
}) {
  const assigned = input.formProgress.length;
  const avgFill =
    assigned > 0
      ? Math.round(
          input.formProgress.reduce((sum, r) => sum + r.fillPercent, 0) / assigned
        )
      : 0;
  const overdue = input.formProgress.filter((r) => r.overdue).length;
  const submitted = input.formProgress.filter((r) => r.submitted).length;

  return [
    {
      id: "fill",
      label: "Среднее заполнение",
      value: `${avgFill}%`,
      subtitle: assigned > 0 ? `${assigned} таблиц назначено` : "Таблиц пока нет",
    },
    {
      id: "submitted",
      label: "Сдано в срок",
      value: String(submitted),
      subtitle: overdue > 0 ? `Просрочено: ${overdue}` : "Без просрочек",
    },
    {
      id: "students",
      label: "Подборки студентов",
      value: String(input.recommendations.length),
      subtitle:
        input.recommendationsUnread > 0
          ? `Новых: ${input.recommendationsUnread}`
          : "Все просмотрены",
    },
    {
      id: "deadlines",
      label: "Ближайшие сроки",
      value: String(input.deadlinesSoon),
      subtitle: `${input.eventsCount} мероприятий в ленте`,
    },
  ];
}
