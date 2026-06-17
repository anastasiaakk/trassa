export type FormColumnType = "text" | "number" | "date" | "select" | "checkbox" | "percent";

/** form — одна строка полей; grid — таблица с несколькими строками */
export type FormLayout = "form" | "grid";

export type FormGridRow = {
  id: string;
  cells: Record<string, FormCellValue>;
};

export type FormColumn = {
  id: string;
  title: string;
  type: FormColumnType;
  required?: boolean;
  options?: string[];
  hint?: string;
};

export type FormTemplateSheet = {
  id: string;
  title: string;
  columns: FormColumn[];
  seedRows?: FormGridRow[];
  layout?: FormLayout;
};

export type FormTemplate = {
  id: string;
  title: string;
  description: string;
  columns: FormColumn[];
  /** form по умолчанию */
  layout?: FormLayout;
  /** Стартовые строки (импорт / превью для подрядчика) */
  seedRows?: FormGridRow[];
  /** ISO — срок сдачи подрядчиками */
  deadlineAt: string | null;
  active: boolean;
  /** Подсказки ИИ для подрядчиков при заполнении */
  aiFillHints: string;
  /** Кто создал шаблон */
  owner?: "admin" | "rador";
  ownerLabel?: string;
  /** Листы импортированного Excel (для переключения вкладок в конструкторе). */
  importSheets?: FormTemplateSheet[];
  createdAt: string;
  updatedAt: string;
};

export type FormAssignment = {
  id: string;
  templateId: string;
  contractorEmailNorm: string;
  assignedAt: string;
};

export type FormCellValue = string | number | boolean;

export type FormSubmission = {
  id: string;
  templateId: string;
  contractorEmailNorm: string;
  /** columnId → value (режим form или первый лист) */
  cells: Record<string, FormCellValue>;
  /** Строки таблицы (режим grid или первый лист) */
  rows?: FormGridRow[];
  /** Данные по листам importSheets (sheetId → cells/rows) */
  sheets?: Record<string, FormSubmissionSheetData>;
  updatedAt: string;
  submittedAt: string | null;
};

export type FormSubmissionSheetData = {
  cells: Record<string, FormCellValue>;
  rows?: FormGridRow[];
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
  summary: {
    contractors: number;
    submitted: number;
    avgFillPercent: number;
  };
};

export type AdminFormsStore = {
  version: 1;
  templates: FormTemplate[];
  assignments: FormAssignment[];
  submissions: FormSubmission[];
  snapshots: FormDeadlineSnapshot[];
};

export type AiPromptEntry = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  updatedAt: string;
};

export type AiPromptLibrary = {
  version: 1;
  prompts: AiPromptEntry[];
};
