import iconv from "iconv-lite";



export function countCyrillic(text: string): number {

  return (text.match(/[а-яёА-ЯЁ]/g) || []).length;

}



function tryDecodeUtf8(buf: Buffer): string | null {

  try {

    return new TextDecoder("utf-8", { fatal: true }).decode(buf);

  } catch {

    return null;

  }

}



function stripBomChar(text: string): string {

  return text.replace(/^\uFEFF/, "");

}



export function looksLikeUtf8MisreadAsWin1251(text: string): boolean {

  if (!text) return false;

  if (/[ÃÐ][\u00A0-\u024f]/.test(text)) return true;

  if (/ï»¿/.test(text)) return true;

  const up = (text.match(/[А-ЯЁ]/g) || []).length;

  const lo = (text.match(/[а-яё]/g) || []).length;

  if (up > 4 && lo < up * 0.35 && /Р.{1,3}[РСТУФХЦЧШЩЭЮЯ]/.test(text)) return true;

  return false;

}



function textDecodeQuality(text: string): number {

  const cyr = countCyrillic(text);

  const lower = (text.match(/[а-яё]/g) || []).length;

  const bad = (text.match(/\uFFFD/g) || []).length;

  const qmarks = (text.match(/\?/g) || []).length;

  const len = Math.max(text.length, 1);

  return (

    cyr * 4 +

    lower * 2 -

    bad * 30 -

    (qmarks > len * 0.1 ? qmarks * 10 : 0) -

    (looksLikeUtf8MisreadAsWin1251(text) ? 200 : 0)

  );

}



function pickBestDecoded(candidates: string[], fallback: string): string {

  let best = fallback;

  let bestQ = -Infinity;

  for (const text of candidates) {

    if (!text || looksLikeUtf8MisreadAsWin1251(text)) continue;

    const q = textDecodeQuality(text);

    if (q > bestQ) {

      bestQ = q;

      best = text;

    }

  }

  return stripBomChar(best);

}



/** Декодирование CSV: UTF-8 (BOM / CSV UTF-8) или Windows-1251 (обычный CSV Excel в РФ). */
export function decodeCsvBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return stripBomChar(iconv.decode(buf.subarray(2), "utf16le"));
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return stripBomChar(iconv.decode(buf.subarray(2), "utf16be"));
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    const body = buf.subarray(3);
    const utf8 = tryDecodeUtf8(body);
    return stripBomChar(utf8 ?? iconv.decode(body, "win1251"));
  }

  const win1251 = iconv.decode(buf, "win1251");
  const utf8 = tryDecodeUtf8(buf);
  if (!utf8) return stripBomChar(win1251);
  if (looksLikeUtf8MisreadAsWin1251(win1251)) return stripBomChar(utf8);

  const cyrW = countCyrillic(win1251);
  const cyrU = countCyrillic(utf8);
  const repU = (utf8.match(/\uFFFD/g) || []).length;
  const qU = (utf8.match(/\?/g) || []).length;

  if (cyrW > cyrU + 1) return stripBomChar(win1251);
  if (cyrU < 2 && cyrW >= 2) return stripBomChar(win1251);
  if (repU > 0 && cyrW >= cyrU) return stripBomChar(win1251);
  if (qU > 4 && cyrU < cyrW) return stripBomChar(win1251);

  return stripBomChar(utf8);
}

/** В файле уже «?» вместо кириллицы (Excel испортил при сохранении). */
export function csvFileLooksLikeCyrillicDestroyed(buf: Buffer): boolean {
  const text = decodeCsvBuffer(buf);
  if (countCyrillic(text) >= 2) return false;

  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^sep\s*=\s*[^\r\n]+$/i.test(l));

  if (lines.length < 2) return false;

  let qRows = 0;
  for (const line of lines.slice(1)) {
    const delim = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.some((c) => /^\?+$/.test(c))) qRows++;
  }

  return qRows >= Math.max(1, Math.ceil((lines.length - 1) * 0.35));
}

export function csvDestroyedUserMessage(filename: string, buf: Buffer): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const text = decodeCsvBuffer(buf);
  const onlyQuestions =
    text.replace(/[\s\r\n;,"'\t]/g, "").length > 0 &&
    !/[а-яёА-ЯЁ]/.test(text) &&
    (text.match(/\?/g) || []).length >= 4;

  if (onlyQuestions) {
    return `Файл «${base}» на диске содержит только «?» (${buf.length} байт) — русский текст при сохранении CSV в Excel уже потерян. Откройте этот CSV в Блокноте: если там тоже «????», нужен новый экспорт. В Excel, где видны русские буквы: «Файл» → «Сохранить как» → «Книга Excel (.xlsx)» или «CSV UTF-8», затем прикрепите новый файл.`;
  }

  return `В файле «${base}» кириллица не сохранилась. Сохраните таблицу заново как .xlsx или «CSV UTF-8» (в Excel: «Файл» → «Сохранить как») и прикрепите новый файл.`;
}

/** @deprecated Используйте decodeCsvBuffer; оставлено для совместимости. */
export function decodeTextBuffer(buf: Buffer): string {
  return decodeCsvBuffer(buf);
}



/** Срабатывает только при явной порче кодировки (не на обычных числах и коротких значениях). */

export function mappedRowsLookLikeEncodingGarbage(

  mappedRows: Record<string, unknown>[]

): boolean {

  let filled = 0;

  let garbage = 0;

  let cyrInValues = 0;



  for (const row of mappedRows) {

    for (const v of Object.values(row)) {

      if (v === undefined || v === null) continue;

      const t = String(v).trim();

      if (!t) continue;

      filled++;

      cyrInValues += countCyrillic(t);

      if (/^[\uFFFD?\s]+$/.test(t)) {

        garbage++;

        continue;

      }

      if (countCyrillic(t) === 0 && /(?:Ã.|Ð.|Ñ.|Â.)/.test(t)) garbage++;

    }

  }



  if (filled === 0) return false;

  if (cyrInValues >= 2) return false;

  return garbage >= Math.max(2, Math.ceil(filled * 0.6));

}



export function cellToImportString(value: unknown): string {

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


