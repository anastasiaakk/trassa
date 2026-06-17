import { callOpenAiChat } from "./adminAiCore.js";
import { buildFileTextPreview, parseImportFile } from "./importParse.js";
import type { FormColumn, FormGridRow, FormTemplate } from "./formsStore.js";
import {
  countCyrillic,
  csvDestroyedUserMessage,
  csvFileLooksLikeCyrillicDestroyed,
  mappedRowsLookLikeEncodingGarbage,
} from "./textDecode.js";

function isGridTemplate(template: FormTemplate): boolean {
  return template.layout === "grid" || (template.seedRows?.length ?? 0) > 0;
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function newRowId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneSeedRows(template: FormTemplate): FormGridRow[] {
  const seed = template.seedRows;
  if (!seed?.length) return [{ id: newRowId(), cells: {} }];
  return seed.map((r) => ({
    id: r.id || newRowId(),
    cells: { ...(r.cells as Record<string, unknown>) },
  }));
}

function coerceServerCell(raw: string, col: FormColumn): string | number | boolean {
  const v = raw.trim();
  if (!v) return "";
  if (col.type === "checkbox") {
    return v === "1" || v.toLowerCase() === "да" || v.toLowerCase() === "yes" || v === "true";
  }
  if (col.type === "number" || col.type === "percent") {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : v;
  }
  return v;
}

/** templateColumnId → fileColumnId */
function mapColumnsByTitle(
  templateCols: FormColumn[],
  fileCols: FormColumn[]
): Map<string, string> {
  const map = new Map<string, string>();
  const usedFile = new Set<string>();

  for (const tc of templateCols) {
    const nt = normalizeTitle(tc.title);
    const fc = fileCols.find((f) => !usedFile.has(f.id) && normalizeTitle(f.title) === nt);
    if (fc) {
      map.set(tc.id, fc.id);
      usedFile.add(fc.id);
    }
  }

  for (const tc of templateCols) {
    if (map.has(tc.id)) continue;
    const nt = normalizeTitle(tc.title);
    if (nt.length < 2) continue;
    const fc = fileCols.find((f) => {
      if (usedFile.has(f.id)) return false;
      const nf = normalizeTitle(f.title);
      return nf.includes(nt) || nt.includes(nf);
    });
    if (fc) {
      map.set(tc.id, fc.id);
      usedFile.add(fc.id);
    }
  }

  return map;
}

/** Если заголовки в Excel чуть другие — сопоставление по порядку столбцов */
function mapColumnsByIndex(templateCols: FormColumn[], fileCols: FormColumn[]): Map<string, string> {
  const map = new Map<string, string>();
  const n = Math.min(templateCols.length, fileCols.length);
  for (let i = 0; i < n; i++) {
    map.set(templateCols[i].id, fileCols[i].id);
  }
  return map;
}

function mergeColumnMaps(primary: Map<string, string>, fallback: Map<string, string>): Map<string, string> {
  const out = new Map(primary);
  for (const tc of [...fallback.keys()]) {
    if (!out.has(tc)) {
      const fId = fallback.get(tc);
      if (fId) out.set(tc, fId);
    }
  }
  return out;
}

function cellHasValue(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  if (typeof raw === "string") return raw.trim().length > 0;
  if (typeof raw === "number") return Number.isFinite(raw);
  if (typeof raw === "boolean") return true;
  return String(raw).trim().length > 0;
}

async function mapColumnsWithAi(
  templateCols: FormColumn[],
  fileCols: FormColumn[]
): Promise<Map<string, string> | null> {
  const payload = {
    templateColumns: templateCols.map((c) => ({ id: c.id, title: c.title, type: c.type })),
    fileColumns: fileCols.map((c, index) => ({ index, title: c.title })),
  };

  const result = await callOpenAiChat({
    purpose: "form_fill_import",
    userContent: JSON.stringify(payload),
    temperature: 0.1,
    maxTokens: 900,
  });

  if (!result.ok) return null;

  try {
    const cleaned = result.reply.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(cleaned) as {
      map?: Array<{ templateColumnId?: string; fileColumnIndex?: number }>;
    };
    if (!Array.isArray(data.map)) return null;

    const out = new Map<string, string>();
    for (const entry of data.map) {
      const tId = entry.templateColumnId?.trim();
      const idx = entry.fileColumnIndex;
      if (!tId || typeof idx !== "number" || idx < 0 || idx >= fileCols.length) continue;
      out.set(tId, fileCols[idx].id);
    }
    return out.size > 0 ? out : null;
  } catch {
    return null;
  }
}

function mapFileRowsToTemplate(
  templateCols: FormColumn[],
  colMap: Map<string, string>,
  fileRows: FormGridRow[]
): Record<string, unknown>[] {
  return fileRows.map((fr) => {
    const cells: Record<string, unknown> = {};
    for (const tc of templateCols) {
      const fId = colMap.get(tc.id);
      if (!fId) continue;
      const raw = fr.cells[fId];
      if (!cellHasValue(raw)) continue;
      const text =
        typeof raw === "string" ? raw : raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw);
      cells[tc.id] = coerceServerCell(text, tc);
    }
    return cells;
  });
}

/** Сопоставление по номеру столбца (1-й столбец файла → 1-й столбец шаблона) — как в скачанном шаблоне. */
function mapDataRowsByPosition(
  templateCols: FormColumn[],
  dataRows: string[][]
): Record<string, unknown>[] {
  return dataRows.map((values) => {
    const cells: Record<string, unknown> = {};
    templateCols.forEach((tc, i) => {
      const v = cellToImportString(values[i]);
      if (!v) return;
      cells[tc.id] = coerceServerCell(v, tc);
    });
    return cells;
  });
}

function cellToImportString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") return value ? "да" : "";
  return String(value).trim();
}

function countFilledCells(mappedRows: Record<string, unknown>[]): number {
  return mappedRows.reduce((sum, row) => sum + Object.keys(row).length, 0);
}

async function extractMappedRowsWithAi(
  templateCols: FormColumn[],
  preview: {
    filename: string;
    headers: string[];
    dataRows: string[][];
    sheetName?: string;
  }
): Promise<Record<string, unknown>[] | null> {
  const filePreview = buildFileTextPreview(preview.headers, preview.dataRows, 45);
  const result = await callOpenAiChat({
    purpose: "form_fill_extract",
    userContent: JSON.stringify({
      filename: preview.filename,
      sheetName: preview.sheetName ?? null,
      templateColumns: templateCols.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
      })),
      filePreview,
    }),
    temperature: 0.1,
    maxTokens: 4500,
  });

  if (!result.ok) return null;

  try {
    const cleaned = result.reply.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(cleaned) as {
      rows?: Array<{ cells?: Record<string, unknown> }>;
    };
    if (!Array.isArray(data.rows)) return null;

    const out: Record<string, unknown>[] = [];

    for (const row of data.rows.slice(0, 80)) {
      if (!row.cells || typeof row.cells !== "object") continue;
      const cells: Record<string, unknown> = {};
      for (const tc of templateCols) {
        const raw = row.cells[tc.id];
        if (!cellHasValue(raw)) continue;
        const text =
          typeof raw === "string"
            ? raw
            : raw instanceof Date
              ? raw.toISOString().slice(0, 10)
              : String(raw);
        cells[tc.id] = coerceServerCell(text, tc);
      }
      if (Object.keys(cells).length > 0) out.push(cells);
    }

    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

function buildColumnMap(templateCols: FormColumn[], fileCols: FormColumn[]): Map<string, string> {
  const byIndex = mapColumnsByIndex(templateCols, fileCols);
  const byTitle = mapColumnsByTitle(templateCols, fileCols);
  if (Math.abs(templateCols.length - fileCols.length) <= 2) {
    return mergeColumnMaps(byIndex, byTitle);
  }
  return mergeColumnMaps(byTitle, byIndex);
}

export async function fillSubmissionFromUploadedFile(
  template: FormTemplate,
  filename: string,
  buf: Buffer,
  draft: { cells: Record<string, unknown>; rows?: FormGridRow[] }
): Promise<
  | {
      ok: true;
      cells: Record<string, unknown>;
      rows?: FormGridRow[];
      message: string;
      usedAi: boolean;
      mappedColumns: number;
    }
  | { ok: false; error: string }
> {
  const isCsvFile = /\.(csv|txt)$/i.test(filename);
  if (isCsvFile && csvFileLooksLikeCyrillicDestroyed(buf)) {
    return { ok: false, error: csvDestroyedUserMessage(filename, buf) };
  }

  const parsed = await parseImportFile(filename, buf, {
    templateColumnTitles: template.columns.map((c) => c.title),
  });
  if (!parsed.ok) return parsed;

  if (parsed.seedRows.length === 0 && parsed.dataRows.length === 0) {
    return {
      ok: false,
      error: "В файле нет строк с данными (нужна строка заголовков и хотя бы одна строка ниже).",
    };
  }

  let colMap = buildColumnMap(template.columns, parsed.columns);
  let usedAi = false;
  const minMatch = Math.max(1, Math.ceil(template.columns.length * 0.35));
  if (colMap.size < minMatch) {
    const aiMap = await mapColumnsWithAi(template.columns, parsed.columns);
    if (aiMap) {
      colMap = mergeColumnMaps(colMap, aiMap);
      usedAi = true;
    }
  }

  const byMap =
    colMap.size > 0
      ? mapFileRowsToTemplate(template.columns, colMap, parsed.seedRows)
      : [];
  const byPosition =
    parsed.dataRows.length > 0
      ? mapDataRowsByPosition(template.columns, parsed.dataRows)
      : [];

  const mapScore = countFilledCells(byMap);
  const posScore = countFilledCells(byPosition);
  let mappedRows = posScore >= mapScore ? byPosition : byMap;
  let filledCellCount = Math.max(mapScore, posScore);
  if (posScore >= mapScore && posScore > 0) {
    colMap = mapColumnsByIndex(template.columns, parsed.columns);
    usedAi = false;
  }

  if (filledCellCount === 0 && (parsed.dataRows.length > 0 || parsed.seedRows.length > 0)) {
    const aiRows = await extractMappedRowsWithAi(template.columns, {
      filename,
      headers: parsed.columns.map((c) => c.title),
      dataRows: parsed.dataRows,
    });
    if (aiRows?.length) {
      mappedRows = aiRows;
      filledCellCount = countFilledCells(mappedRows);
      usedAi = true;
    }
  }

  if (filledCellCount === 0) {
    return {
      ok: false,
      error:
        "В файле не найдены данные для столбцов шаблона. Заполните строки под заголовками (со 2-й строки в Excel) и прикрепите снова. Лучше скачать шаблон кнопкой «Скачать шаблон» и не менять названия столбцов в первой строке.",
    };
  }

  const isTextFile = isCsvFile;
  if (isTextFile && mappedRowsLookLikeEncodingGarbage(mappedRows)) {
    return {
      ok: false,
      error:
        "Кириллица в CSV не прочиталась. Сохраните таблицу как .xlsx (рекомендуется) или CSV UTF-8: в Excel «Файл» → «Сохранить как» → «CSV UTF-8 (разделители — запятые) (*.csv)».",
    };
  }
  const isGrid = isGridTemplate(template);

  if (isGrid) {
    const baseRows = draft.rows?.length ? draft.rows : cloneSeedRows(template);
    const merged: FormGridRow[] = baseRows.map((br, i) => ({
      id: br.id,
      cells: { ...br.cells, ...(mappedRows[i] ?? {}) },
    }));
    for (let i = baseRows.length; i < mappedRows.length; i++) {
      const cells = mappedRows[i];
      if (!cells || Object.keys(cells).length === 0) continue;
      merged.push({ id: newRowId(), cells });
    }
    const filledRows = mappedRows.filter((r) => Object.keys(r).length > 0).length;
    const autoNote = usedAi ? " (ИИ сопоставил таблицу)" : "";
    return {
      ok: true,
      cells: {},
      rows: merged,
      usedAi,
      mappedColumns: colMap.size,
      message: `Данные из файла подставлены: ${filledRows} строк${autoNote}. Проверьте и нажмите «Сохранить черновик».`,
    };
  }

  const mergedCells = { ...draft.cells, ...(mappedRows[0] ?? {}) };
  const fieldCount = Object.keys(mappedRows[0] ?? {}).length;
  const autoNote = usedAi ? " (ИИ сопоставил таблицу)" : "";
  return {
    ok: true,
    cells: mergedCells,
    usedAi,
    mappedColumns: colMap.size,
    message: `Данные из файла подставлены: ${fieldCount} полей${autoNote}. Проверьте и нажмите «Сохранить черновик».`,
  };
}
