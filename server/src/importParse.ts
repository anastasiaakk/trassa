import mammoth from "mammoth";
import {
  parseHeadersToColumns,
  type FormColumn,
  type FormGridRow,
  type FormTemplateSheet,
} from "./formsStore.js";
import { cellToImportString, decodeCsvBuffer } from "./textDecode.js";
import {
  findBestHeaderRowIndex,
  isTextTableFilename,
  mergeHeaderRows,
  pickBestSheet,
  sheetToRows,
  shouldTryWorkbookParse,
  SUPPORTED_TABLE_FORMATS_HINT,
  tryReadWorkbook,
  visibleSheetNames,
} from "./spreadsheetParse.js";

export { buildFileTextPreview, SUPPORTED_TABLE_FORMATS_HINT } from "./spreadsheetParse.js";

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function headersFromHtml(html: string): string[] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (table) {
    const row = table.match(/<tr[\s\S]*?<\/tr>/i)?.[0];
    if (row) {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
      const headers = cells.map((c) => stripHtml(c[1])).filter((h) => h.length > 0);
      if (headers.length > 0) return headers;
    }
  }
  return [];
}

function dataRowsFromHtml(html: string): string[][] {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return [];
  const trs = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)];
  if (trs.length < 2) return [];
  return trs.slice(1).map((tr) => {
    const cells = [...tr[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    return cells.map((c) => stripHtml(c[1]));
  });
}

function splitPlainLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim());
  }
  if (line.includes(";")) {
    return line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
  }
  if (line.includes(",")) {
    return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  }
  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map((c) => c.trim());
  }
  return [line.trim()];
}

function csvTextLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^sep\s*=\s*[^\r\n]+$/i.test(l));
}

function headersFromPlainText(text: string): string[] {
  const lines = csvTextLines(text);
  const first = lines[0];
  if (!first) return [];
  return splitPlainLine(first);
}

function dataRowsFromPlainText(text: string): string[][] {
  const lines = csvTextLines(text);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => splitPlainLine(line));
}

function newRowId(i: number): string {
  return `seed-${i + 1}`;
}

function sheetIdFromName(name: string, idx: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base ? `sheet-${base}-${idx + 1}` : `sheet-${idx + 1}`;
}

function buildSeedRows(columns: FormColumn[], dataRows: string[][]): FormGridRow[] {
  return dataRows
    .filter((r) => r.some((c) => cellToImportString(c)))
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

function countFilledCells(row: unknown[]): number {
  return row.filter((c) => cellToImportString(c)).length;
}

function isPreambleDataRow(row: unknown[]): boolean {
  const texts = row.map((c) => cellToImportString(c)).filter(Boolean);
  if (texts.length === 0) return true;
  const joined = texts.join(" ").toLowerCase();
  if (texts.length <= 2 && texts[0].length > 55) return true;
  if (/^(сверка|дата обработки|легенда)\b/i.test(joined)) return true;
  return false;
}

function looksLikeSubheaderRow(row: unknown[], headerFilled: number): boolean {
  if (!Array.isArray(row) || isPreambleDataRow(row)) return false;
  const filled = countFilledCells(row);
  if (filled < 2 || filled > headerFilled) return false;
  const texts = row.map((c) => cellToImportString(c)).filter(Boolean);
  const shortEnough = texts.filter((t) => t.length <= 80).length >= texts.length * 0.7;
  const notMostlyNumbers = texts.filter((t) => /^\d+([.,]\d+)?$/.test(t)).length <= 1;
  return shortEnough && notMostlyNumbers;
}

function shouldMergeSubheaderRow(headerRow: unknown[], subRow: unknown[], maxCols: number): boolean {
  let bridgeCells = 0;
  let overlapCells = 0;

  for (let i = 0; i < maxCols; i++) {
    const headerCell = cellToImportString(headerRow[i]);
    const subCell = cellToImportString(subRow[i]);
    if (!subCell) continue;
    if (!headerCell) bridgeCells += 1;
    else overlapCells += 1;
  }

  // Мержим только если есть явные признаки двухуровневой шапки.
  return bridgeCells >= 2 || (bridgeCells >= 1 && overlapCells >= 3);
}

/** Сохраняем позиции столбцов (пустые ячейки в шапке не сдвигают данные). */
function parseSheetRows(
  rows: unknown[][],
  templateTitles?: string[]
): { headers: string[]; dataRows: string[][] } {
  const headerIdx = findBestHeaderRowIndex(rows, templateTitles);
  if (headerIdx < 0) return { headers: [], dataRows: [] };

  const headerRow = rows[headerIdx] as unknown[];
  let headerFilled = countFilledCells(headerRow);
  let dataStart = headerIdx + 1;

  let maxCols = headerRow.length;
  for (const r of rows.slice(headerIdx + 1)) {
    if (Array.isArray(r) && r.length > maxCols) maxCols = r.length;
  }

  let headerTitles: string[];
  if (
    rows[dataStart] &&
    looksLikeSubheaderRow(rows[dataStart] as unknown[], headerFilled) &&
    shouldMergeSubheaderRow(headerRow, rows[dataStart] as unknown[], maxCols)
  ) {
    headerTitles = mergeHeaderRows(headerRow, rows[dataStart] as unknown[], maxCols);
    dataStart += 1;
  } else {
    headerTitles = [];
    for (let i = 0; i < maxCols; i++) {
      const h = cellToImportString(headerRow[i]);
      headerTitles.push(h || `Столбец ${i + 1}`);
    }
  }

  const dataRows = rows
    .slice(dataStart)
    .filter((r) => Array.isArray(r) && !isPreambleDataRow(r) && countFilledCells(r) >= 2)
    .map((r) => {
      const line: string[] = [];
      for (let i = 0; i < maxCols; i++) {
        line.push(cellToImportString((r as unknown[])[i]));
      }
      return line;
    });

  return { headers: headerTitles, dataRows };
}

function normalizeHeaderTitles(headers: string[]): string[] {
  return headers.map((h, i) => {
    const t = h.trim();
    if (!t || /^столбец\s+\d+$/i.test(t)) return `Столбец ${i + 1}`;
    return t.slice(0, 120);
  });
}

export type ParseImportHint = { templateColumnTitles?: string[] };

export async function parseImportFile(
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
    }
  | { ok: false; error: string }
> {
  const templateTitles = hint?.templateColumnTitles;
  const name = filename.toLowerCase();
  let headers: string[] = [];
  let dataRows: string[][] = [];
  let sheetName: string | undefined;

  try {
    if (isTextTableFilename(name)) {
      const text = decodeCsvBuffer(buf);
      headers = headersFromPlainText(text);
      dataRows = dataRowsFromPlainText(text);
    } else if (shouldTryWorkbookParse(name, buf)) {
      const wb = tryReadWorkbook(buf);
      if (!wb) {
        return { ok: false, error: "Не удалось открыть таблицу Excel. Сохраните файл как .xlsx и попробуйте снова." };
      }
      const picked = pickBestSheet(wb, templateTitles);
      if (!picked) return { ok: false, error: "В книге Excel нет листов с данными." };
      sheetName = picked.sheetName;
      const parsed = parseSheetRows(sheetToRows(picked.sheet), templateTitles);
      headers = parsed.headers;
      dataRows = parsed.dataRows;
    } else if (name.endsWith(".docx")) {
      const html = await mammoth.convertToHtml({ buffer: buf });
      headers = headersFromHtml(html.value);
      dataRows = dataRowsFromHtml(html.value);
      if (headers.length === 0) {
        const text = await mammoth.extractRawText({ buffer: buf });
        headers = headersFromPlainText(text.value);
        dataRows = dataRowsFromPlainText(text.value);
      }
    } else if (name.endsWith(".doc")) {
      return {
        ok: false,
        error: "Формат .doc не поддерживается. Сохраните файл как .docx или Excel.",
      };
    } else {
      const wb = tryReadWorkbook(buf);
      if (wb) {
        const picked = pickBestSheet(wb, templateTitles);
        if (picked) {
          sheetName = picked.sheetName;
          const parsed = parseSheetRows(sheetToRows(picked.sheet), templateTitles);
          headers = parsed.headers;
          dataRows = parsed.dataRows;
        }
      }
      if (headers.length === 0 && dataRows.length === 0) {
        return {
          ok: false,
          error: `Формат не поддерживается. Используйте: ${SUPPORTED_TABLE_FORMATS_HINT}.`,
        };
      }
    }
  } catch {
    return { ok: false, error: "Не удалось разобрать файл." };
  }

  const normalizedHeaders = normalizeHeaderTitles(headers);
  const columns = parseHeadersToColumns(normalizedHeaders);
  if (columns.length === 0) {
    return { ok: false, error: "Не найдены столбцы (первая строка таблицы или заголовки)." };
  }
  const seedRows = buildSeedRows(columns, dataRows);
  return { ok: true, columns, seedRows, dataRows, sheetName };
}

export function parseImportWorkbookSheets(
  filename: string,
  buf: Buffer,
  hint?: ParseImportHint
): FormTemplateSheet[] {
  if (!shouldTryWorkbookParse(filename.toLowerCase(), buf)) return [];
  const wb = tryReadWorkbook(buf);
  if (!wb) return [];

  const templateTitles = hint?.templateColumnTitles;
  const out: FormTemplateSheet[] = [];

  visibleSheetNames(wb).forEach((sheetName, idx) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;
    const parsed = parseSheetRows(sheetToRows(sheet), templateTitles);
    const normalizedHeaders = normalizeHeaderTitles(parsed.headers);
    const columns = parseHeadersToColumns(normalizedHeaders);
    const seedRows = buildSeedRows(columns, parsed.dataRows);
    if (columns.length < 2 || seedRows.length === 0) return;
    out.push({
      id: sheetIdFromName(sheetName, idx),
      title: sheetName,
      columns,
      seedRows,
      layout: "grid",
    });
  });

  return out;
}
