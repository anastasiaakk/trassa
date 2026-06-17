import type { FormColumn, FormTemplate } from "../types/adminForms";
import { templateLayout } from "./adminFormsGrid";

const TYPE_HINT: Record<string, string> = {
  text: "текст, без лишних пробелов в начале/конце",
  number: "целое или дробное число (точка или запятая)",
  percent: "число 0–100 (проценты)",
  date: "дата в формате ГГГГ-ММ-ДД",
  checkbox: "отметьте «да», если условие выполнено",
  select: "выберите значение из списка",
};

const BAD_HINTS =
  /приятно это слышать|остановиться и отметить|что именно вам|как вы это переживаете|поговорить по душам|расскажите|запомнилось|т-бот|без спешки разберёмся|мне важно понять/i;

export function isUnusableAiHints(text: string): boolean {
  const t = text.trim();
  if (t.length < 30) return true;
  if (BAD_HINTS.test(t)) return true;
  if (/^\?+$/.test(t)) return true;
  return false;
}

function columnLine(col: FormColumn, idx: number): string {
  const req = col.required !== false ? "обязательно" : "по возможности";
  const typeHint = TYPE_HINT[col.type] ?? "значение по смыслу заголовка";
  const extra = col.hint ? ` Примечание: ${col.hint}.` : "";
  return `${idx + 1}. «${col.title}» — ${typeHint}; поле ${req}.${extra}`;
}

/** Детерминированные подсказки без «чат-бота». */
export function buildLocalFillHints(template: FormTemplate): string {
  const cols = template.columns.filter((c) => c.title.trim());
  const lines: string[] = [];

  lines.push(
    `Таблица «${template.title}»: заполните все обязательные столбцы до отправки.`
  );
  if (template.description.trim()) {
    lines.push(`Назначение: ${template.description.trim()}`);
  }
  if (template.deadlineAt) {
    lines.push(
      `Срок сдачи: ${new Date(template.deadlineAt).toLocaleString("ru-RU")}. После срока правки могут быть недоступны.`
    );
  }
  if (templateLayout(template) === "grid") {
    lines.push(
      "Режим таблицы: каждая строка — отдельная запись. Добавляйте строки кнопкой «+ Строка», если записей больше одной."
    );
  }

  if (cols.length === 0) {
    lines.push("Столбцы не заданы — дождитесь обновления шаблона от администратора.");
  } else {
    lines.push("По столбцам:");
    cols.forEach((c, i) => lines.push(columnLine(c, i)));
  }

  lines.push(
    "Перед отправкой нажмите «Сохранить черновик», проверьте процент заполнения, затем «Отправить». Не оставляйте пустые обязательные ячейки."
  );

  return lines.join("\n");
}

export function normalizeHintsText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
