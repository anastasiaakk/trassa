import type { FormColumn, FormTemplate } from "../types/adminForms";

export function stripMergedHeaderWithFirstRow(
  columns: FormColumn[],
  seedRows?: { cells: Record<string, unknown> }[],
): FormColumn[] {
  const firstRow = seedRows?.[0]?.cells;
  if (!firstRow) return columns;
  let changed = false;
  const next = columns.map((col) => {
    const title = String(col.title ?? "");
    const value = String(firstRow[col.id] ?? "").trim();
    if (!value) return col;
    const marker = ` — ${value}`;
    if (!title.endsWith(marker)) return col;
    changed = true;
    return { ...col, title: title.slice(0, -marker.length).trim() || col.title };
  });
  return changed ? next : columns;
}

export function sanitizeTemplateMergedHeaders(template: FormTemplate): FormTemplate {
  const baseColumns = stripMergedHeaderWithFirstRow(template.columns, template.seedRows);
  const sheets = template.importSheets?.map((sheet) => ({
    ...sheet,
    columns: stripMergedHeaderWithFirstRow(sheet.columns, sheet.seedRows),
  }));
  return {
    ...template,
    columns: baseColumns,
    importSheets: sheets,
  };
}
