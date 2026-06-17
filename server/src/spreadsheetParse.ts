import * as XLSX from "xlsx";
import { cellToImportString } from "./textDecode.js";

const TEXT_EXT = /\.(csv|txt|tsv)$/i;
const NAMED_EXCEL_EXT =
  /\.(xlsx|xls|xlsm|xlsb|xls|ods|fods|xltx|xltm|xlam|dif|slk|sylk|prn|numbers)$/i;

export function isTextTableFilename(filename: string): boolean {
  return TEXT_EXT.test(filename.toLowerCase());
}

export function isNamedSpreadsheetFilename(filename: string): boolean {
  return NAMED_EXCEL_EXT.test(filename.toLowerCase());
}

/** ZIP (xlsx/xlsm/ods) или OLE (.xls). */
export function bufferLooksLikeSpreadsheet(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf[0] === 0x50 && buf[1] === 0x4b) return true;
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return true;
  return false;
}

export function shouldTryWorkbookParse(filename: string, buf: Buffer): boolean {
  if (isTextTableFilename(filename) && !bufferLooksLikeSpreadsheet(buf)) return false;
  if (isNamedSpreadsheetFilename(filename) || bufferLooksLikeSpreadsheet(buf)) return true;
  return tryReadWorkbook(buf) !== null;
}

export function tryReadWorkbook(buf: Buffer): XLSX.WorkBook | null {
  try {
    const wb = XLSX.read(buf, {
      type: "buffer",
      cellDates: true,
      dense: true,
      raw: false,
    });
    return wb.SheetNames.length > 0 ? wb : null;
  } catch {
    return null;
  }
}

function isSheetHidden(wb: XLSX.WorkBook, sheetName: string): boolean {
  const meta = wb.Workbook?.Sheets?.find((s) => s?.name === sheetName);
  // 0/undefined = visible, 1 = hidden, 2 = veryHidden
  return Boolean(meta && typeof meta.Hidden === "number" && meta.Hidden > 0);
}

export function visibleSheetNames(wb: XLSX.WorkBook): string[] {
  const names = wb.SheetNames.filter((name) => !isSheetHidden(wb, name));
  return names.length > 0 ? names : wb.SheetNames;
}

function normHeaderTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function countFilledCells(row: unknown[]): number {
  return row.filter((c) => cellToImportString(c)).length;
}

/** Строка-преамбула: 1–2 ячейки или один длинный заголовок отчёта. */
function isPreambleRow(row: unknown[]): boolean {
  const texts = row.map((c) => cellToImportString(c)).filter(Boolean);
  const filled = texts.length;
  if (filled === 0) return true;
  if (filled <= 2) {
    if (filled === 1 && texts[0].length > 55) return true;
    if (filled === 2 && texts.every((t) => t.length > 40)) return true;
  }
  const lower = texts.join(" ").toLowerCase();
  if (
    /^(сверка|дата обработки|легенда|legend|отчёт|report)\b/i.test(lower) ||
    lower.includes("цветовой маркировк")
  ) {
    return true;
  }
  return false;
}

function scoreHeaderRowCandidate(rows: unknown[][], idx: number): number {
  const row = rows[idx];
  if (!Array.isArray(row) || isPreambleRow(row)) return -1;

  const filled = countFilledCells(row);
  if (filled < 3) return -1;

  const texts = row.map((c) => cellToImportString(c)).filter(Boolean);
  const shortLabels = texts.filter((t) => t.length > 0 && t.length <= 100).length;
  const numericOnly = texts.filter((t) => /^\d+([.,]\d+)?$/.test(t)).length;

  let score = filled * 4 + shortLabels * 2 - numericOnly * 6;

  const following = rows
    .slice(idx + 1, idx + 8)
    .filter((r): r is unknown[] => Array.isArray(r) && !isPreambleRow(r) && countFilledCells(r) >= 3);

  if (following.length === 0) return score - 25;

  const avgNextFilled =
    following.reduce((sum, r) => sum + countFilledCells(r), 0) / following.length;
  if (avgNextFilled >= filled * 0.45) score += 20;
  if (avgNextFilled < Math.min(3, filled * 0.3)) score -= 30;

  return score;
}

/** Находит строку заголовков (пропускает шапку отчёта, легенду и пустые строки). */
export function findBestHeaderRowIndex(
  rows: unknown[][],
  templateTitles?: string[]
): number {
  const hints = (templateTitles ?? []).map((t) => normHeaderTitle(t)).filter((t) => t.length > 1);
  if (hints.length > 0) {
    let bestIdx = -1;
    let bestScore = 0;
    const scan = Math.min(rows.length, 25);
    for (let idx = 0; idx < scan; idx++) {
      const row = rows[idx];
      if (!Array.isArray(row)) continue;
      const cells = row.map((c) => normHeaderTitle(cellToImportString(c)));
      let match = 0;
      for (const h of hints) {
        if (cells.some((c) => c === h || (c.length > 2 && (c.includes(h) || h.includes(c))))) {
          match++;
        }
      }
      if (match > bestScore) {
        bestScore = match;
        bestIdx = idx;
      }
    }
    if (bestScore >= Math.min(2, hints.length)) return bestIdx;
  }

  let bestIdx = -1;
  let bestScore = -1;
  const scan = Math.min(rows.length, 45);
  for (let idx = 0; idx < scan; idx++) {
    const s = scoreHeaderRowCandidate(rows, idx);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = idx;
    }
  }
  if (bestIdx >= 0 && bestScore > 0) return bestIdx;

  return rows.findIndex((r) => Array.isArray(r) && countFilledCells(r) >= 3);
}

function looksLikeSubheaderRow(row: unknown[], headerFilled: number): boolean {
  if (!Array.isArray(row) || isPreambleRow(row)) return false;
  const filled = countFilledCells(row);
  if (filled < 2 || filled > headerFilled) return false;
  const texts = row.map((c) => cellToImportString(c)).filter(Boolean);
  if (texts.length === 0) return false;
  const shortEnough = texts.filter((t) => t.length <= 80).length >= texts.length * 0.7;
  const notMostlyNumbers = texts.filter((t) => /^\d+([.,]\d+)?$/.test(t)).length <= 1;
  return shortEnough && notMostlyNumbers;
}

export function mergeHeaderRows(rowA: unknown[], rowB: unknown[], maxCols: number): string[] {
  const headers: string[] = [];
  for (let i = 0; i < maxCols; i++) {
    const a = cellToImportString(rowA[i]);
    const b = cellToImportString(rowB[i]);
    if (a && b && a !== b) headers.push(`${a} — ${b}`.slice(0, 120));
    else headers.push(a || b || `Столбец ${i + 1}`);
  }
  return headers;
}

export function sheetToRows(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
}

export function scoreSheetRows(rows: unknown[][], templateTitles?: string[]): number {
  const headerIdx = findBestHeaderRowIndex(rows, templateTitles);
  if (headerIdx < 0) return 0;

  const headerRow = rows[headerIdx] as unknown[];
  const headerFilled = countFilledCells(headerRow);
  let dataStart = headerIdx + 1;
  if (rows[dataStart] && looksLikeSubheaderRow(rows[dataStart] as unknown[], headerFilled)) {
    dataStart += 1;
  }

  const headers = headerRow.map((c) => cellToImportString(c)).filter(Boolean);
  const dataCount = rows
    .slice(dataStart)
    .filter((r) => Array.isArray(r) && !isPreambleRow(r) && countFilledCells(r) >= 3).length;

  let score = dataCount * 10 + headerFilled * 2;
  const hints = (templateTitles ?? []).map(normHeaderTitle).filter((t) => t.length > 1);
  for (const h of headers) {
    const nh = normHeaderTitle(h);
    if (hints.some((t) => t === nh || (t.length > 2 && (nh.includes(t) || t.includes(nh))))) {
      score += 5;
    }
  }
  return score;
}

const REPORT_SHEET_NAME = /^(проверка|отч[её]т|report|log|сверка|audit)$/i;
const REPORT_HEADER = /^(№|n|лист|строка|колонка|значение было|значение стало|комментарий|статус|уровень уверенности)$/i;

function isReportLikeSheet(rows: unknown[][], sheetName: string): boolean {
  if (REPORT_SHEET_NAME.test(sheetName.trim())) return true;
  const headerIdx = findBestHeaderRowIndex(rows);
  if (headerIdx < 0) return false;
  const headerRow = rows[headerIdx] as unknown[];
  const headers = headerRow.map((c) => normHeaderTitle(cellToImportString(c))).filter(Boolean);
  if (headers.length < 4) return false;
  const reportHits = headers.filter((h) => REPORT_HEADER.test(h)).length;
  return reportHits >= 4;
}

export function pickBestSheet(
  wb: XLSX.WorkBook,
  templateTitles?: string[]
): { sheet: XLSX.WorkSheet; sheetName: string } | null {
  let best: { sheet: XLSX.WorkSheet; sheetName: string; score: number } | null = null;
  let bestData: { sheet: XLSX.WorkSheet; sheetName: string; score: number } | null = null;

  for (const sheetName of visibleSheetNames(wb)) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rows = sheetToRows(sheet);
    let score = scoreSheetRows(rows, templateTitles);
    const reportLike = isReportLikeSheet(rows, sheetName);
    if (reportLike) score = Math.round(score * 0.15);

    const entry = { sheet, sheetName, score };
    if (!best || score > best.score) best = entry;
    if (!reportLike && (!bestData || score > bestData.score)) bestData = entry;
  }

  const winner = bestData ?? best;
  if (!winner || winner.score <= 0) {
    const first = wb.SheetNames[0];
    const sheet = first ? wb.Sheets[first] : undefined;
    if (!sheet) return null;
    return { sheet, sheetName: first };
  }

  return { sheet: winner.sheet, sheetName: winner.sheetName };
}

export function buildFileTextPreview(
  headers: string[],
  dataRows: string[][],
  maxRows = 40
): string {
  const cell = (v: string) => v.replace(/\t/g, " ").replace(/\r?\n/g, " ").slice(0, 240);
  const lines = [headers.map((h) => cell(h || "")).join("\t")];
  for (const row of dataRows.slice(0, maxRows)) {
    lines.push(row.map((v) => cell(String(v ?? ""))).join("\t"));
  }
  if (dataRows.length > maxRows) {
    lines.push(`… ещё ${dataRows.length - maxRows} строк`);
  }
  return lines.join("\n");
}

export const SUPPORTED_TABLE_FORMATS_HINT =
  ".xlsx, .xls, .xlsm, .xlsb, .ods, .csv, .tsv, .txt, .docx (таблица в Word)";
