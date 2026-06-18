export const PAGE_LEDE = "Шаблоны от администратора. Заполните до срока сдачи.";

export const ATTACH_ACCEPT =
  ".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.xlsb,.ods,.xltx,.xltm,.docx";

export function formatDeadlineRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}
