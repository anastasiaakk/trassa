import { isAiConfigured } from "./aiConfig.js";
import { callOpenAiChat } from "./adminAiCore.js";
import { parseHeadersToColumns, type FormColumn, type FormGridRow } from "./formsStore.js";
import {
  parseImportFile,
  type ParseImportHint,
} from "./importParse.js";
import {
  buildFileTextPreview,
  mergeHeaderRows,
  sheetToRows,
  tryReadWorkbook,
  visibleSheetNames,
} from "./spreadsheetParse.js";
import { cellToImportString } from "./textDecode.js";

export type AiTableImportStructure = {
  sheetName: string;
  headerRowIndex: number;
  subheaderRowIndex: number | null;
  columnCount: number;
  columns: Array<{ index: number; title: string }>;
};

function newRowId(i: number): string {
  return `seed-${i + 1}`;
}

function countFilledCells(row: unknown[]): number {
  return row.filter((c) => cellToImportString(c)).length;
}

function isPreambleRow(row: unknown[]): boolean {
  const texts = row.map((c) => cellToImportString(c)).filter(Boolean);
  if (texts.length === 0) return true;
  if (texts.length <= 2 && texts[0].length > 55) return true;
  const joined = texts.join(" ").toLowerCase();
  return /^(сверка|дата обработки|легенда)\b/i.test(joined) || joined.includes("цветовой маркировк");
}

function buildSheetsPreviewForAi(
  wb: ReturnType<typeof tryReadWorkbook>,
  maxSheets = 6,
  maxRowsPerSheet = 22
): Array<{ sheetName: string; preview: string; rowCount: number }> {
  if (!wb) return [];
  const out: Array<{ sheetName: string; preview: string; rowCount: number }> = [];

  for (const sheetName of visibleSheetNames(wb).slice(0, maxSheets)) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = sheetToRows(sheet);
    const slice = rows.slice(0, maxRowsPerSheet);
    const maxCols = Math.max(0, ...slice.map((r) => (Array.isArray(r) ? r.length : 0)));
    const headers: string[] = [];
    for (let c = 0; c < Math.min(maxCols, 40); c++) {
      headers.push(`C${c + 1}`);
    }
    const dataRows = slice.map((r) => {
      const line: string[] = [];
      for (let c = 0; c < headers.length; c++) {
        line.push(cellToImportString(Array.isArray(r) ? r[c] : ""));
      }
      return line;
    });
    out.push({
      sheetName,
      preview: buildFileTextPreview(headers, dataRows, maxRowsPerSheet),
      rowCount: rows.length,
    });
  }

  return out;
}

async function analyzeStructureWithAi(
  filename: string,
  sheetsPreview: Array<{ sheetName: string; preview: string; rowCount: number }>
): Promise<AiTableImportStructure | null> {
  if (sheetsPreview.length === 0) return null;

  const payload = {
    filename,
    sheets: sheetsPreview.map((s) => ({
      sheetName: s.sheetName,
      totalRows: s.rowCount,
      preview: s.preview,
    })),
  };

  const result = await callOpenAiChat({
    purpose: "table_template_import",
    userContent: JSON.stringify(payload),
    temperature: 0.1,
    maxTokens: 1400,
  });

  if (!result.ok) return null;

  try {
    const cleaned = result.reply.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(cleaned) as Partial<AiTableImportStructure>;
    if (!data.sheetName || typeof data.headerRowIndex !== "number") return null;
    if (!Array.isArray(data.columns) || data.columns.length < 2) return null;

    const columnCount =
      typeof data.columnCount === "number" && data.columnCount >= 2
        ? Math.min(data.columnCount, 120)
        : Math.max(...data.columns.map((c) => c.index + 1), 2);

    return {
      sheetName: String(data.sheetName),
      headerRowIndex: Math.max(0, Math.floor(data.headerRowIndex)),
      subheaderRowIndex:
        typeof data.subheaderRowIndex === "number"
          ? Math.max(0, Math.floor(data.subheaderRowIndex))
          : null,
      columnCount,
      columns: data.columns
        .filter((c) => typeof c.index === "number" && c.title?.trim())
        .map((c) => ({
          index: Math.max(0, Math.floor(c.index)),
          title: String(c.title).trim().slice(0, 120),
        })),
    };
  } catch {
    return null;
  }
}

function extractFromAiStructure(
  rows: unknown[][],
  structure: AiTableImportStructure
): { headers: string[]; dataRows: string[][] } {
  const headerIdx = structure.headerRowIndex;
  const subIdx = structure.subheaderRowIndex;
  const maxCols = structure.columnCount;

  const headerRow = rows[headerIdx] as unknown[] | undefined;
  const subRow =
    subIdx != null && subIdx > headerIdx && subIdx < rows.length
      ? (rows[subIdx] as unknown[])
      : undefined;

  let headerTitles: string[];
  const shouldUseSubheader = (() => {
    if (!subRow) return false;
    const filled = countFilledCells(subRow);
    if (filled < 2 || filled > maxCols) return false;
    let bridgeCells = 0;
    let overlapCells = 0;
    for (let i = 0; i < maxCols; i++) {
      const headerCell = cellToImportString(headerRow?.[i]);
      const subCellText = cellToImportString(subRow[i]);
      if (!subCellText) continue;
      if (!headerCell) bridgeCells += 1;
      else overlapCells += 1;
    }
    return bridgeCells >= 2 || (bridgeCells >= 1 && overlapCells >= 3);
  })();

  if (subRow && shouldUseSubheader) {
    headerTitles = mergeHeaderRows(headerRow ?? [], subRow, maxCols);
  } else {
    headerTitles = [];
    for (let i = 0; i < maxCols; i++) {
      const fromAi = structure.columns.find((c) => c.index === i)?.title;
      const fromRow = cellToImportString(headerRow?.[i]);
      headerTitles.push(fromAi || fromRow || `Столбец ${i + 1}`);
    }
  }

  const dataStart =
    subRow && subIdx != null && subIdx > headerIdx ? subIdx + 1 : headerIdx + 1;

  const dataRows = rows
    .slice(dataStart)
    .filter((r) => Array.isArray(r) && !isPreambleRow(r) && countFilledCells(r) >= 2)
    .map((r) => {
      const line: string[] = [];
      for (let i = 0; i < maxCols; i++) {
        line.push(cellToImportString((r as unknown[])[i]));
      }
      return line;
    });

  return { headers: headerTitles, dataRows };
}

function buildSeedRows(columns: FormColumn[], dataRows: string[][]): FormGridRow[] {
  return dataRows
    .filter((r) => r.some((c) => c))
    .slice(0, 500)
    .map((values, i) => {
      const cells: Record<string, string> = {};
      columns.forEach((col, ci) => {
        const v = cellToImportString(values[ci]);
        if (v) cells[col.id] = v;
      });
      return { id: newRowId(i), cells };
    })
    .filter((r) => Object.keys(r.cells).length > 0);
}

function normalizeHeaderTitles(headers: string[]): string[] {
  return headers.map((h, i) => {
    const t = h.trim();
    if (!t || /^столбец\s+\d+$/i.test(t)) return `Столбец ${i + 1}`;
    return t.slice(0, 120);
  });
}

/** Импорт: ИИ определяет лист и шапку, значения ячеек берутся из файла как есть. */
export async function parseImportFileSmart(
  filename: string,
  buf: Buffer,
  hint?: ParseImportHint
): Promise<
  | {
      ok: true;
      columns: FormColumn[];
      seedRows: FormGridRow[];
      dataRows: string[][];
      sheetName?: string;
      usedAi: boolean;
    }
  | { ok: false; error: string }
> {
  const wb = tryReadWorkbook(buf);
  const hasAi = isAiConfigured();

  if (hasAi && wb) {
    const previews = buildSheetsPreviewForAi(wb);
    const structure = await analyzeStructureWithAi(filename, previews);
    if (structure) {
      const sheet = wb.Sheets[structure.sheetName] ?? wb.Sheets[wb.SheetNames[0]];
      if (sheet) {
        const rows = sheetToRows(sheet);
        const extracted = extractFromAiStructure(rows, structure);
        const normalizedHeaders = normalizeHeaderTitles(extracted.headers);
        const columns = parseHeadersToColumns(normalizedHeaders);
        if (columns.length >= 2 && extracted.dataRows.length > 0) {
          const seedRows = buildSeedRows(columns, extracted.dataRows);
          if (seedRows.length > 0) {
            return {
              ok: true,
              columns,
              seedRows,
              dataRows: extracted.dataRows,
              sheetName: structure.sheetName,
              usedAi: true,
            };
          }
        }
      }
    }
  }

  const fallback = await parseImportFile(filename, buf, hint);
  if (!fallback.ok) return fallback;
  return {
    ok: true,
    columns: fallback.columns,
    seedRows: fallback.seedRows,
    dataRows: fallback.dataRows,
    sheetName: fallback.sheetName,
    usedAi: false,
  };
}
