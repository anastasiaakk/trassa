/** Таблица Windows-1251 (байты 0x80–0xFF) → Unicode. */
const CP1251_UNICODE = [
  0x0402, 0x0403, 0x201a, 0x0453, 0x201e, 0x2026, 0x2020, 0x2021, 0x20ac, 0x2030, 0x0409,
  0x2039, 0x040a, 0x040c, 0x040b, 0x040f, 0x0452, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0xfffd, 0x2122, 0x0459, 0x203a, 0x045a, 0x045c, 0x045b, 0x045f, 0x00a0,
  0x040e, 0x045e, 0x0408, 0x00a4, 0x0490, 0x00a6, 0x00a7, 0x0401, 0x00a9, 0x0404, 0x00ab,
  0x00ac, 0x00ad, 0x00ae, 0x0407, 0x00b0, 0x00b1, 0x0406, 0x0456, 0x0491, 0x00b5, 0x00b6,
  0x00b7, 0x0451, 0x2116, 0x0454, 0x00bb, 0x0458, 0x0405, 0x0455, 0x0457, 0x0410, 0x0411,
  0x0412, 0x0413, 0x0414, 0x0415, 0x0416, 0x0417, 0x0418, 0x0419, 0x041a, 0x041b, 0x041c,
  0x041d, 0x041e, 0x041f, 0x0420, 0x0421, 0x0422, 0x0423, 0x0424, 0x0425, 0x0426, 0x0427,
  0x0428, 0x0429, 0x042a, 0x042b, 0x042c, 0x042d, 0x042e, 0x042f, 0x0430, 0x0431, 0x0432,
  0x0433, 0x0434, 0x0435, 0x0436, 0x0437, 0x0438, 0x0439, 0x043a, 0x043b, 0x043c, 0x043d,
  0x043e, 0x043f, 0x0440, 0x0441, 0x0442, 0x0443, 0x0444, 0x0445, 0x0446, 0x0447, 0x0448,
  0x0449, 0x044a, 0x044b, 0x044c, 0x044d, 0x044e, 0x044f,
] as const;

export function countCyrillic(text: string): number {
  return (text.match(/[а-яёА-ЯЁ]/g) || []).length;
}

const UNICODE_TO_CP1251 = new Map<number, number>();
for (let i = 0; i < CP1251_UNICODE.length; i++) {
  const cp = CP1251_UNICODE[i];
  if (!UNICODE_TO_CP1251.has(cp)) UNICODE_TO_CP1251.set(cp, 0x80 + i);
}

/** Кодирование в Windows-1251 (обычный CSV Excel в России). */
export function encodeWin1251(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp < 0x80) {
      out.push(cp);
      continue;
    }
    out.push(UNICODE_TO_CP1251.get(cp) ?? 0x3f);
  }
  return new Uint8Array(out);
}

export function decodeWin1251Bytes(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else out += String.fromCodePoint(CP1251_UNICODE[b - 0x80]);
  }
  return out;
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

export function textDecodeQuality(text: string): number {
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

export function stripBomChar(text: string): string {
  return text.replace(/^\uFEFF/, "");
}
