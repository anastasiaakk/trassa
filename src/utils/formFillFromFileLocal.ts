import type { FormCellValue, FormGridRow, FormTemplate } from "../types/adminForms";
import { coerceCellValue, initialSubmissionRows, templateLayout } from "./adminFormsGrid";
import { parseCsvToTemplate } from "./adminFormsStorage";
import {
  csvDestroyedClientMessage,
  csvTextLooksLikeCyrillicDestroyed,
} from "./csvTextDecode";

function mapColumnsByTitle(
  template: FormTemplate,
  fileColumns: { id: string; title: string }[]
): Map<string, string> {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, " ")
      .trim();
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const tc of template.columns) {
    const nt = norm(tc.title);
    const fc = fileColumns.find((f) => !used.has(f.id) && norm(f.title) === nt);
    if (fc) {
      map.set(tc.id, fc.id);
      used.add(fc.id);
    }
  }
  return map;
}

function mapColumnsByIndex(template: FormTemplate, fileColumns: { id: string; title: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  const n = Math.min(template.columns.length, fileColumns.length);
  for (let i = 0; i < n; i++) {
    map.set(template.columns[i].id, fileColumns[i].id);
  }
  return map;
}

function mergeMaps(primary: Map<string, string>, extra: Map<string, string>): Map<string, string> {
  const out = new Map(primary);
  extra.forEach((v, k) => {
    if (!out.has(k)) out.set(k, v);
  });
  return out;
}

export function fillFormFromCsvTextLocal(
  template: FormTemplate,
  csvText: string,
  draft: { cells: Record<string, FormCellValue>; rows?: FormGridRow[] },
  sourceFilename = "файл.csv"
):
  | {
      ok: true;
      cells: Record<string, FormCellValue>;
      rows?: FormGridRow[];
      message: string;
    }
  | { ok: false; error: string } {
  if (csvTextLooksLikeCyrillicDestroyed(csvText)) {
    return { ok: false, error: csvDestroyedClientMessage(sourceFilename, csvText) };
  }

  const parsed = parseCsvToTemplate(csvText, template.title);
  if (!parsed) {
    return { ok: false, error: "Не удалось разобрать CSV. Первая строка — заголовки столбцов." };
  }
  if (!parsed.seedRows?.length) {
    return { ok: false, error: "В файле нет строк с данными." };
  }

  const colMap = mergeMaps(
    mapColumnsByTitle(template, parsed.columns),
    mapColumnsByIndex(template, parsed.columns)
  );
  if (colMap.size === 0) {
    return {
      ok: false,
      error: "Столбцы CSV не совпали с шаблоном. Используйте скачанный шаблон без переименования заголовков.",
    };
  }

  const mapped = parsed.seedRows.map((fr) => {
    const cells: Record<string, FormCellValue> = {};
    for (const tc of template.columns) {
      const fId = colMap.get(tc.id);
      if (!fId) continue;
      const raw = String(fr.cells[fId] ?? "").trim();
      if (!raw) continue;
      cells[tc.id] = coerceCellValue(raw, tc);
    }
    return cells;
  });

  const delim = csvText.includes(";") ? ";" : csvText.includes("\t") ? "\t" : ",";
  const dataLines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) =>
      delim === "\t"
        ? line.split("\t").map((c) => c.trim())
        : line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""))
    )
    .filter((cells) => cells.some((c) => c.trim()));

  const positional = dataLines.map((values) => {
    const cells: Record<string, FormCellValue> = {};
    template.columns.forEach((tc, i) => {
      const raw = String(values[i] ?? "").trim();
      if (!raw) return;
      cells[tc.id] = coerceCellValue(raw, tc);
    });
    return cells;
  });

  const mapScore = mapped.reduce((sum, row) => sum + Object.keys(row).length, 0);
  const posScore = positional.reduce((sum, row) => sum + Object.keys(row).length, 0);
  const finalMapped = posScore >= mapScore ? positional : mapped;
  const filledCellCount = Math.max(mapScore, posScore);

  if (filledCellCount === 0) {
    return {
      ok: false,
      error:
        "В файле не найдены данные для столбцов шаблона. Заполните строки под заголовками и прикрепите снова.",
    };
  }

  if (templateLayout(template) === "grid") {
    const baseRows = draft.rows?.length ? draft.rows : initialSubmissionRows(template);
    const rows: FormGridRow[] = baseRows.map((br, i) => ({
      id: br.id,
      cells: { ...br.cells, ...(finalMapped[i] ?? {}) },
    }));
    for (let i = baseRows.length; i < finalMapped.length; i++) {
      if (Object.keys(finalMapped[i] ?? {}).length > 0) {
        rows.push({
          id: `row-${Date.now()}-${i}`,
          cells: finalMapped[i],
        });
      }
    }
    return {
      ok: true,
      cells: {},
      rows,
      message: `Подставлено из CSV: ${finalMapped.filter((r) => Object.keys(r).length > 0).length} строк.`,
    };
  }

  return {
    ok: true,
    cells: { ...draft.cells, ...(finalMapped[0] ?? {}) },
    message: `Подставлено из CSV: ${Object.keys(finalMapped[0] ?? {}).length} полей.`,
  };
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = r.result;
      if (typeof res !== "string") {
        reject(new Error("Файл не прочитан"));
        return;
      }
      const base64 = res.includes(",") ? res.split(",")[1] ?? "" : res;
      resolve(base64);
    };
    r.onerror = () => reject(new Error("Файл не прочитан"));
    r.readAsDataURL(file);
  });
}

export {
  csvDestroyedClientMessage,
  csvTextLooksLikeCyrillicDestroyed,
  readCsvFileText,
} from "./csvTextDecode";
