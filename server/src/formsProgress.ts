import type { FormColumn } from "./formsStore.js";

export type GridRow = { id: string; cells: Record<string, unknown> };

export type TemplateLike = {
  layout?: "form" | "grid";
  columns: FormColumn[];
  seedRows?: GridRow[];
};

export type SubmissionLike = {
  cells: Record<string, unknown>;
  rows?: GridRow[];
  sheets?: Record<string, { cells: Record<string, unknown>; rows?: GridRow[] }>;
};

export type TemplateWithSheets = TemplateLike & {
  importSheets?: Array<{
    id: string;
    columns: FormColumn[];
    layout?: "form" | "grid";
    seedRows?: GridRow[];
  }>;
};

function isFilled(value: unknown, col: FormColumn): boolean {
  if (value === undefined || value === null) return false;
  if (col.type === "checkbox") return value === true;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

export function computeFillPercent(columns: FormColumn[], cells: Record<string, unknown>): number {
  const pool = columns.filter((c) => c.required !== false);
  const cols = pool.length > 0 ? pool : columns;
  if (cols.length === 0) return 100;
  const filled = cols.filter((c) => isFilled(cells[c.id], c)).length;
  return Math.round((filled / cols.length) * 100);
}

function cloneSeedRows(seed?: GridRow[]): GridRow[] {
  if (!seed?.length) return [{ id: `row-${Date.now()}`, cells: {} }];
  return seed.map((r) => ({ id: r.id || `row-${Date.now()}`, cells: { ...(r.cells ?? {}) } }));
}

export function submissionFillPercent(template: TemplateLike, submission: SubmissionLike): number {
  const withSheets = template as TemplateWithSheets;
  const sheets = withSheets.importSheets;
  if (sheets && sheets.length > 1) {
    const pcts = sheets.map((sheet, i) => {
      const saved = submission.sheets?.[sheet.id];
      const slice: TemplateLike = {
        layout: sheet.layout ?? template.layout,
        columns: sheet.columns,
        seedRows: sheet.seedRows,
      };
      const data: SubmissionLike =
        saved ??
        (i === 0
          ? { cells: submission.cells ?? {}, rows: submission.rows }
          : { cells: {}, rows: sheet.seedRows });
      return submissionFillPercent(slice, data);
    });
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }
  if (template.layout === "grid") {
    const rows = submission.rows?.length ? submission.rows : cloneSeedRows(template.seedRows);
    if (rows.length === 0) return 0;
    const pcts = rows.map((r) => computeFillPercent(template.columns, r.cells ?? {}));
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }
  return computeFillPercent(template.columns, submission.cells ?? {});
}
