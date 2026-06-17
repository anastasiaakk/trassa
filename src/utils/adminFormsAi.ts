import { adminAiChat, generateAdminFillHints } from "../api/adminFormsApi";
import { getAdminApiToken } from "../api/adminApi";
import type { AdminFormsStore, FormTemplate } from "../types/adminForms";
import { serializeStoreSummary } from "./adminFormsExport";
import { listAllMonitoring } from "./adminFormsStorage";
import { isAuthApiEnabled } from "./authMode";
import {
  buildLocalFillHints,
  isUnusableAiHints,
  normalizeHintsText,
} from "./formFillHintsLocal";
import { templateLayout } from "./adminFormsGrid";

export async function generateTemplateFillHints(template: FormTemplate): Promise<string> {
  const local = buildLocalFillHints(template);

  if (isAuthApiEnabled() && getAdminApiToken()) {
    const r = await generateAdminFillHints({
      title: template.title,
      description: template.description,
      layout: templateLayout(template),
      deadlineAt: template.deadlineAt,
      columns: template.columns.map((c) => ({
        title: c.title,
        type: c.type,
        required: c.required,
        hint: c.hint,
      })),
    });
    if (r.ok) {
      const hints = normalizeHintsText(r.hints);
      if (!isUnusableAiHints(hints)) return hints;
    }
  }

  return local;
}

export async function runAdminAiQuery(
  userPrompt: string,
  store: AdminFormsStore
): Promise<string> {
  const monitoring = listAllMonitoring();
  const context = [
    "Контекст портала ТрассА (админ):",
    serializeStoreSummary(store),
    monitoring.length
      ? `Мониторинг (первые 40): ${monitoring
          .slice(0, 40)
          .map((m) => `${m.templateTitle} / ${m.contractorLabel}: ${m.fillPercent}%${m.submitted ? ", сдано" : ""}`)
          .join("; ")}`
      : "Мониторинг пуст.",
  ].join("\n");

  if (isAuthApiEnabled() && getAdminApiToken()) {
    const r = await adminAiChat({
      messages: [{ role: "user", content: userPrompt }],
      context,
    });
    if (r.ok) return r.reply;
    return `Ошибка ИИ: ${r.error}\n\nПроверьте OPENAI_API_KEY на сервере и перезапустите API.`;
  }

  return [
    "Серверный ИИ недоступен (нет API или токена администратора).",
    "",
    "Запрос:",
    userPrompt,
    "",
    "Краткий контекст:",
    context.slice(0, 1500),
    "",
    "Настройте OPENAI_API_KEY в .env сервера и войдите в админку с API.",
  ].join("\n");
}
