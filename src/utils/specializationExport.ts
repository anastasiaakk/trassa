import { buildSpecializationBuckets, specializationTitle } from "./specializationsStorage";

function csvEscape(v: string): string {
  const s = String(v ?? "");
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Свод по спецификациям — CSV для Excel (UTF-8 BOM, разделитель ;). */
export function downloadSpecializationsCsvLocal(): void {
  const buckets = buildSpecializationBuckets();
  const lines = [
    "\uFEFFСпецификация;Роль;Фамилия;Имя;E-mail;Телефон;Организация;Дата регистрации",
  ];
  for (const b of buckets) {
    for (const m of [...b.students, ...b.contractors]) {
      lines.push(
        [
          b.specialization.title,
          m.roleKind === "student" ? "Студент" : "Подрядчик",
          m.profile.lastName,
          m.profile.firstName,
          m.profile.email,
          m.profile.phone,
          m.profile.contractorCompanyName,
          m.createdAt,
        ]
          .map(csvEscape)
          .join(";")
      );
    }
    for (const m of b.unassignedStudents) {
      lines.push(
        [
          "Без спецификации",
          "Студент",
          m.profile.lastName,
          m.profile.firstName,
          m.profile.email,
          m.profile.phone,
          "",
          m.createdAt,
        ]
          .map(csvEscape)
          .join(";")
      );
    }
    for (const m of b.unassignedContractors) {
      lines.push(
        [
          "Без спецификации",
          "Подрядчик",
          m.profile.lastName,
          m.profile.firstName,
          m.profile.email,
          m.profile.phone,
          m.profile.contractorCompanyName,
          m.createdAt,
        ]
          .map(csvEscape)
          .join(";")
      );
    }
  }
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trassa-specializations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatMemberName(last: string, first: string): string {
  return `${last} ${first}`.trim() || "—";
}

export { specializationTitle };
