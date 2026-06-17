import type { AdminFormsStore, FormCellValue, FormTemplate } from "../types/adminForms";
import { templateLayout, cloneSeedRows } from "./adminFormsGrid";
import { listMonitoringForTemplate } from "./adminFormsStorage";
import { encodeWin1251 } from "./cp1251Decode";

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function safeExportBasename(title: string): string {
  const base = title
    .replace(/[^\wа-яА-ЯёЁ\d-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return base || "shablon";
}

function formatTemplateCell(value: FormCellValue | undefined): string {
  if (value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "да" : "";
  return String(value);
}

function triggerCsvDownloadUtf8(filename: string, lines: string[]): void {
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Шаблон для подрядчика: Windows-1251 без BOM — совместим с «обычным CSV» в Excel (РФ). */
function triggerCsvDownloadWin1251(filename: string, lines: string[]): void {
  const bytes = encodeWin1251(lines.join("\r\n"));
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Пустой шаблон для подрядчика: заголовки столбцов и стартовые строки (если таблица). */
export function downloadFormTemplateCsv(template: FormTemplate): void {
  if (template.columns.length === 0) return;

  const header = template.columns.map((c) => escapeCsvCell(c.title));
  const lines: string[] = [header.join(";")];

  if (templateLayout(template) === "grid") {
    const rows = template.seedRows?.length ? template.seedRows : cloneSeedRows(template.seedRows);
    for (const row of rows) {
      lines.push(
        template.columns
          .map((col) => escapeCsvCell(formatTemplateCell(row.cells[col.id])))
          .join(";")
      );
    }
  } else {
    lines.push(template.columns.map(() => "").join(";"));
  }

  triggerCsvDownloadWin1251(`${safeExportBasename(template.title)}.csv`, lines);
}

export function downloadMonitoringCsv(template: FormTemplate): void {
  const rows = listMonitoringForTemplate(template.id);
  const header = ["Подрядчик", "E-mail", "Заполнено %", "Сдано", "Просрочено"];
  const lines = [
    header.join(";"),
    ...rows.map((r) =>
      [
        escapeCsvCell(r.contractorLabel),
        escapeCsvCell(r.contractorEmailNorm),
        String(r.fillPercent),
        r.submitted ? "да" : "нет",
        r.overdue ? "да" : "нет",
      ].join(";")
    ),
  ];
  triggerCsvDownloadUtf8(`monitoring-${safeExportBasename(template.title)}.csv`, lines);
}

export function downloadAiResultCsv(title: string, lines: string[][]): void {
  const body = lines.map((row) => row.map((c) => escapeCsvCell(String(c))).join(";"));
  triggerCsvDownloadUtf8(`${safeExportBasename(title)}.csv`, body);
}

export function serializeStoreSummary(store: AdminFormsStore): string {
  const parts = [
    `Шаблонов: ${store.templates.length}`,
    `Назначений: ${store.assignments.length}`,
    `Ответов: ${store.submissions.length}`,
    `Срезов по срокам: ${store.snapshots.length}`,
  ];
  return parts.join("; ");
}
