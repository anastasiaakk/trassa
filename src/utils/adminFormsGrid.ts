import type { FormCellValue, FormColumn, FormGridRow, FormLayout, FormTemplate } from "../types/adminForms";
import { computeFillPercent } from "./adminFormsProgress";

export function templateLayout(
  template: Pick<FormTemplate, "layout" | "seedRows">
): FormLayout {
  if (template.layout === "grid") return "grid";
  if (template.seedRows && template.seedRows.length > 0) return "grid";
  return "form";
}

export function newGridRowId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `row-${globalThis.crypto.randomUUID()}`;
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyGridRow(): FormGridRow {
  return { id: newGridRowId(), cells: {} };
}

export function cloneSeedRows(seed?: FormGridRow[]): FormGridRow[] {
  if (!seed?.length) return [emptyGridRow()];
  return seed.map((r) => ({
    id: r.id || newGridRowId(),
    cells: { ...r.cells },
  }));
}

export function initialSubmissionRows(template: FormTemplate): FormGridRow[] {
  if (templateLayout(template) !== "grid") return [];
  return cloneSeedRows(template.seedRows);
}

export function submissionFillPercentSingle(
  template: FormTemplate,
  submission: { cells: Record<string, FormCellValue>; rows?: FormGridRow[] }
): number {
  if (templateLayout(template) === "grid") {
    const rows = submission.rows?.length ? submission.rows : cloneSeedRows(template.seedRows);
    if (rows.length === 0) return 0;
    const pcts = rows.map((r) => computeFillPercent(template.columns, r.cells));
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }
  return computeFillPercent(template.columns, submission.cells);
}

export { submissionFillPercent } from "./formSheetUtils";

export function coerceCellValue(raw: string, col: FormColumn): FormCellValue {
  const v = raw.trim();
  if (col.type === "checkbox") {
    return v === "1" || v.toLowerCase() === "да" || v.toLowerCase() === "yes" || v === "true";
  }
  if (col.type === "number" || col.type === "percent") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : v;
  }
  return v;
}

export function rowFromImportValues(columns: FormColumn[], values: string[]): FormGridRow {
  const cells: Record<string, FormCellValue> = {};
  columns.forEach((col, i) => {
    const raw = String(values[i] ?? "").trim();
    if (!raw) return;
    cells[col.id] = coerceCellValue(raw, col);
  });
  return { id: newGridRowId(), cells };
}
