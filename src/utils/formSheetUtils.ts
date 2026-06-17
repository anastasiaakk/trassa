import type {
  FormCellValue,
  FormGridRow,
  FormSubmission,
  FormSubmissionSheetData,
  FormTemplate,
  FormTemplateSheet,
} from "../types/adminForms";
import { initialSubmissionRows, submissionFillPercentSingle, templateLayout } from "./adminFormsGrid";

export function templateHasSheetTabs(template: Pick<FormTemplate, "importSheets">): boolean {
  return (template.importSheets?.length ?? 0) > 1;
}

export function sheetAsTemplate(
  template: FormTemplate,
  sheet: FormTemplateSheet
): Pick<FormTemplate, "columns" | "layout" | "seedRows"> {
  return {
    columns: sheet.columns,
    layout: sheet.layout ?? template.layout,
    seedRows: sheet.seedRows,
  };
}

export function emptySheetCells(sheet: FormTemplateSheet): Record<string, FormCellValue> {
  return Object.fromEntries(sheet.columns.map((c) => [c.id, "" as FormCellValue]));
}

export function initialSheetSubmissionData(
  template: FormTemplate,
  sheet: FormTemplateSheet
): FormSubmissionSheetData {
  const slice = sheetAsTemplate(template, sheet);
  if (templateLayout(slice) === "grid") {
    return { cells: {}, rows: initialSubmissionRows({ ...template, ...slice }) };
  }
  return { cells: emptySheetCells(sheet) };
}

export function buildSheetDraftsFromSubmission(
  template: FormTemplate,
  submission?: FormSubmission | null
): Record<string, FormSubmissionSheetData> {
  const sheets = template.importSheets ?? [];
  const drafts: Record<string, FormSubmissionSheetData> = {};
  for (const sheet of sheets) {
    const saved = submission?.sheets?.[sheet.id];
    if (saved) {
      drafts[sheet.id] = {
        cells: { ...(saved.cells ?? {}) },
        rows: saved.rows?.map((r) => ({ id: r.id, cells: { ...r.cells } })),
      };
      continue;
    }
    if (sheet.id === sheets[0]?.id && submission) {
      drafts[sheet.id] = {
        cells: { ...(submission.cells ?? {}) },
        rows: submission.rows?.map((r) => ({ id: r.id, cells: { ...r.cells } })),
      };
      continue;
    }
    drafts[sheet.id] = initialSheetSubmissionData(template, sheet);
  }
  return drafts;
}

export function submissionFillPercentAllSheets(
  template: FormTemplate,
  sheetDrafts: Record<string, FormSubmissionSheetData>
): number {
  const sheets = template.importSheets ?? [];
  if (sheets.length <= 1) return 0;
  const pcts = sheets.map((sheet) => {
    const data = sheetDrafts[sheet.id] ?? initialSheetSubmissionData(template, sheet);
    return submissionFillPercentSingle(
      { ...template, ...sheetAsTemplate(template, sheet) },
      data
    );
  });
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

export function submissionFillPercent(
  template: FormTemplate,
  submission: FormSubmission | { cells: Record<string, FormCellValue>; rows?: FormGridRow[]; sheets?: FormSubmission["sheets"] }
): number {
  if (templateHasSheetTabs(template)) {
    const drafts = buildSheetDraftsFromSubmission(template, submission as FormSubmission);
    return submissionFillPercentAllSheets(template, drafts);
  }
  return submissionFillPercentSingle(template, submission);
}

export function mergeSheetDraftsWithActive(
  template: FormTemplate,
  sheetDrafts: Record<string, FormSubmissionSheetData>,
  activeSheetId: string | null,
  active: FormSubmissionSheetData
): Record<string, FormSubmissionSheetData> {
  const sheets = template.importSheets ?? [];
  const merged = { ...sheetDrafts };
  const sheetId = activeSheetId ?? sheets[0]?.id;
  if (sheetId) merged[sheetId] = active;
  return merged;
}

export function primarySheetPayload(
  template: FormTemplate,
  sheetDrafts: Record<string, FormSubmissionSheetData>
): FormSubmissionSheetData {
  const primaryId = template.importSheets?.[0]?.id;
  if (primaryId && sheetDrafts[primaryId]) return sheetDrafts[primaryId];
  const first = Object.values(sheetDrafts)[0];
  return first ?? { cells: {} };
}
