import {
  countCyrillic,
  decodeWin1251Bytes,
  looksLikeUtf8MisreadAsWin1251,
  stripBomChar,
} from "./cp1251Decode";

function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function stripBomBytes(bytes: Uint8Array): { body: Uint8Array; hadUtf8Bom: boolean } {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { body: bytes.subarray(3), hadUtf8Bom: true };
  }
  return { body: bytes, hadUtf8Bom: false };
}

/** Как на сервере: UTF-8 (CSV UTF-8) или Windows-1251 (обычный CSV Excel). */
export function decodeCsvBytes(buffer: ArrayBuffer): string {
  const raw = new Uint8Array(buffer);

  if (raw.length >= 2 && raw[0] === 0xff && raw[1] === 0xfe) {
    return stripBomChar(new TextDecoder("utf-16le").decode(raw.subarray(2)));
  }

  const { body, hadUtf8Bom } = stripBomBytes(raw);
  const win1251 = decodeWin1251Bytes(body);
  const utf8 = tryDecodeUtf8(body);

  if (hadUtf8Bom) {
    return stripBomChar(utf8 ?? win1251);
  }

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

export function readCsvFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      if (!(r.result instanceof ArrayBuffer)) {
        reject(new Error("Файл не прочитан"));
        return;
      }
      resolve(decodeCsvBytes(r.result));
    };
    r.onerror = () => reject(new Error("Файл не прочитан"));
    r.readAsArrayBuffer(file);
  });
}

/** Файл уже сохранён с «?» вместо кириллицы. */
export function csvTextLooksLikeCyrillicDestroyed(text: string): boolean {
  if (countCyrillic(text) >= 2) return false;

  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^sep\s*=\s*[^\r\n]+$/i.test(l));

  if (lines.length < 1) return false;

  let qRows = 0;
  const dataLines = lines.length > 1 ? lines.slice(1) : lines;
  for (const line of dataLines) {
    const delim = line.includes(";") ? ";" : line.includes("\t") ? "\t" : ",";
    const cells = line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.some((c) => /^\?+$/.test(c))) qRows++;
  }

  return qRows >= Math.max(1, Math.ceil(dataLines.length * 0.35));
}

export function csvDestroyedClientMessage(filename: string, text: string): string {
  const onlyQuestions =
    text.replace(/[\s\r\n;,"'\t]/g, "").length > 0 &&
    countCyrillic(text) < 2 &&
    (text.match(/\?/g) || []).length >= 4;

  if (onlyQuestions) {
    return `Файл «${filename}» содержит только «?» — русский текст при сохранении CSV уже потерян. Откройте CSV в Блокноте. В Excel, где видны русские буквы, сохраните как .xlsx или «CSV UTF-8» и прикрепите новый файл.`;
  }

  return `В файле «${filename}» кириллица не читается. Сохраните как .xlsx или «CSV UTF-8» и прикрепите снова.`;
}
