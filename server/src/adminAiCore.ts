import {
  aiNotConfiguredError,
  isAiConfigured,
  resolveAiApiBase,
  resolveAiModel,
  resolveAiProvider,
  resolveOpenAiStyleApiKey,
  resolveOpenAiStyleExtraHeaders,
  resolveOpenRouterTbotFallbackModels,
  resolveTbotMaxTokens,
} from "./aiConfig.js";
import { getGigachatAccessToken, fetchGigachat } from "./gigachatAuth.js";
import { isOpenAiGeoBlockMessage, openAiFetch, resolveOpenAiProxyUrl } from "./openAiHttp.js";

export type AiPurpose =
  | "admin_chat"
  | "design_system"
  | "fill_hints"
  | "tbot_chat"
  | "form_fill_import"
  | "form_fill_extract"
  | "table_template_import";

const DESIGN_SYSTEM_AI_SYSTEM = `Ты — редактор дизайн-системы портала ТрассА v2 (glass SaaS, референсы MediAid, Rentier, E-Commerce Analytics).

СТРОГО только 5 цветов палитры:
- primary #2B64FD — акцент, CTA, KPI
- white #FFFFFF — фоны
- ink #1C1C1C — основной текст
- surface #F6F6F6 — редко (треки, hover)
- muted #6B6B6B — вторичный текст

Можно менять: palette (5 hex), radius.sm/md/lg (например "16px"), blur.md, cssVars из списка:
--pv2-primary, --pv2-white, --pv2-ink, --pv2-surface, --pv2-muted,
--pv2-radius-sm, --pv2-radius-md, --pv2-radius-lg, --pv2-blur-md, --pv2-font-kpi

Отвечай ТОЛЬКО валидным JSON (без markdown вне json):
{
  "reply": "краткое пояснение по-русски что изменено",
  "patch": {
    "palette": { "primary": "#2B64FD" },
    "radius": { "md": "20px" },
    "cssVars": { "--pv2-font-kpi": "clamp(1.4rem, 2.4vw, 1.9rem)" }
  }
}

Правила:
- patch только изменённые поля
- HEX строго #RRGGBB
- Не добавляй новые цвета вне палитры
- Если запрос невозможен — reply с объяснением, patch пустой {} или опусти patch`;

const ADMIN_CHAT_SYSTEM =
  process.env.ADMIN_AI_SYSTEM?.trim() ||
  `Ты — деловой ИИ-аналитик администратора портала ТрассА (образование, подрядчики, РАДОР).
Помогаешь с таблицами, мониторингом заполнения, распределением студентов, импортом данных.
Отвечай по-русски, структурированно: списки, таблицы, чёткие шаги.
Не веди small talk, не задавай личных вопросов, не имитируй психологическую поддержку.
Если просят CSV/Excel — дай заголовки столбцов и пример 2–3 строк.
Если просят распределение — пары «студент → подрядчик» с кратким обоснованием.`;

const TBOT_SYSTEM =
  process.env.TBOT_AI_SYSTEM?.trim() ||
  `Ты — Т-бот, полноценный ИИ-помощник портала ТрассА (образование, подрядчики, школы, СПО, ассоциация РАДОР).

Твои задачи:
- Отвечать по-русски: чётко, по делу, дружелюбно, без навязчивой «психотерапии» и пустых вопросов «что запомнилось».
- Помогать по кабинету: мероприятия и календарь, мессенджер, профиль и настройки, таблицы от администратора, профориентация, документы, команды студентов, рекомендации.
- Давать пошаговые инструкции (1. 2. 3.), если спрашивают «где нажать».
- Кратко поддерживать эмоционально, если человек расстроен, но возвращаться к практической помощи.
- Отвечай компактно: обычно 2–5 предложений или короткий список; длинный текст — только если явно просят подробно.

Знай контекст ролей:
- Подрядчик: /page4, таблицы /page4/forms, студенты, документы.
- Школа/СПО/студент: свои кабинеты, календарь, материалы.
- РАДОР: /page5, мониторинг таблиц /page5/forms.

Не выдумывай факты о пользователе. Если данных нет — спроси один уточняющий вопрос по теме портала.
Запрещено: бесконечный small talk, фразы «как приятно это слышать», уход в посторонние темы без связи с порталом.`;

const FILL_HINTS_SYSTEM = `Ты составляешь ИНСТРУКЦИЮ для подрядчика по заполнению таблицы в портале ТрассА.

ОБЯЗАТЕЛЬНО:
- Только деловой русский, без приветствий и эмпатии
- 5–8 пунктов (маркеры «•» или нумерация 1.)
- В каждом пункте: название столбца → что вносить, формат (дата ДД.ММ.ГГГГ, число, %, да/нет), типичная ошибка
- Упомяни срок сдачи, если он указан
- Для режима «таблица» (несколько строк): каждая строка = отдельная запись (студент, объект, позиция)
- В конце один пункт про кнопки «Сохранить черновик» и «Отправить»

ЗАПРЕЩЕНО: small talk, «как приятно», «расскажите», «что запомнилось», вопросы к читателю, роль психолога/друга.`;

const FORM_FILL_IMPORT_SYSTEM = `Ты сопоставляешь столбцы шаблона портала ТрассА с заголовками из Excel/CSV подрядчика.
Верни ТОЛЬКО валидный JSON (без markdown и пояснений):
{"map":[{"templateColumnId":"id из templateColumns","fileColumnIndex":0}]}
fileColumnIndex — номер столбца в файле (с нуля). Сопоставляй по смыслу, синонимам и сокращениям названий.
Не добавляй столбцы, которых нет в templateColumns.`;

const FORM_FILL_EXTRACT_SYSTEM = `Ты извлекаешь данные из таблицы Excel/CSV для заполнения шаблона портала ТрассА.
На входе: templateColumns (столбцы шаблона) и filePreview (таблица: первая строка — заголовки, далее данные, разделитель — табуляция).

Верни ТОЛЬКО валидный JSON (без markdown):
{"rows":[{"cells":{"<templateColumnId>":"<значение>",...}},...]}

Правила:
- Используй только id из templateColumns как ключи в cells
- Сопоставляй столбцы файла и шаблона по смыслу, синонимам, сокращениям
- Числа и даты — строками как в файле (даты ДД.ММ.ГГГГ)
- Пустые ячейки не добавляй
- До 80 строк; только строки с данными
- Не выдумывай значения`;

const TABLE_TEMPLATE_IMPORT_SYSTEM = `Ты анализируешь структуру Excel/CSV для импорта шаблона таблицы в портал ТрассА.
Ты НЕ меняешь и НЕ переписываешь значения ячеек — только указываешь, где заголовки и где данные.

На входе: список листов (sheetName) и для каждого — первые строки таблицы (табуляция между ячейками).

Верни ТОЛЬКО валидный JSON (без markdown):
{
  "sheetName": "имя листа с основной таблицей",
  "headerRowIndex": 0,
  "subheaderRowIndex": null,
  "columnCount": 12,
  "columns": [{"index": 0, "title": "Название столбца"}, ...]
}

Правила:
- headerRowIndex — строка с названиями столбцов (0 = первая строка листа)
- subheaderRowIndex — если шапка в 2 строки (подзаголовки), иначе null
- columnCount — число столбцов с учётом пустых колонок между блоками (макс. индекс + 1)
- columns — только столбцы с осмысленным заголовком; index с нуля, title как в файле (кратко, без выдумок)
- Выбирай лист с табличными данными (распределение, вузы, компании), НЕ журнал проверки/сверки/легенду
- Пропускай преамбулу: «Сверка», «Дата обработки», «Легенда» — это не headerRowIndex
- Не включай строки данных в columns — только заголовки`;

export function systemPromptFor(purpose: AiPurpose): string {
  if (purpose === "fill_hints") return FILL_HINTS_SYSTEM;
  if (purpose === "form_fill_import") return FORM_FILL_IMPORT_SYSTEM;
  if (purpose === "form_fill_extract") return FORM_FILL_EXTRACT_SYSTEM;
  if (purpose === "table_template_import") return TABLE_TEMPLATE_IMPORT_SYSTEM;
  if (purpose === "tbot_chat") return TBOT_SYSTEM;
  if (purpose === "design_system") return DESIGN_SYSTEM_AI_SYSTEM;
  return ADMIN_CHAT_SYSTEM;
}

function buildChatCompletionBody(input: {
  model: string;
  provider: ReturnType<typeof resolveAiProvider>;
  systemContent: string;
  dialog: Array<{ role: "user" | "assistant"; content: string }>;
  temperature: number;
  max_tokens: number;
}): string {
  const payload: Record<string, unknown> = {
    model: input.model,
    messages: [{ role: "system", content: input.systemContent }, ...input.dialog],
    temperature: input.temperature,
    max_tokens: input.max_tokens,
  };
  if (input.provider === "openrouter") {
    payload.provider = { sort: "latency", allow_fallbacks: true };
  }
  return JSON.stringify(payload);
}

function shouldRetryOpenRouterModel(status: number): boolean {
  return status === 404 || status === 429 || status === 503;
}

export async function callOpenAiChat(input: {
  purpose: AiPurpose;
  userContent: string;
  context?: string;
  /** Полная история для tbot (user/assistant). Если задана — userContent игнорируется как отдельное сообщение. */
  chatMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const provider = resolveAiProvider();
  const apiBase = resolveAiApiBase();
  const primaryModel = resolveAiModel(input.purpose);
  const openAiStyleKey = resolveOpenAiStyleApiKey();

  if (!isAiConfigured()) {
    return { ok: false, error: aiNotConfiguredError() };
  }

  const systemParts = [systemPromptFor(input.purpose)];
  if (input.context?.trim()) {
    systemParts.push(`\n\nДанные портала:\n${input.context.trim()}`);
  }

  const temperature =
    input.temperature ??
    (input.purpose === "fill_hints" ||
    input.purpose === "form_fill_import" ||
    input.purpose === "form_fill_extract" ||
    input.purpose === "table_template_import"
      ? 0.15
      : input.purpose === "tbot_chat"
        ? 0.4
        : 0.35);
  const max_tokens =
    input.maxTokens ??
    (input.purpose === "fill_hints"
      ? 1200
      : input.purpose === "form_fill_extract"
        ? 4500
        : input.purpose === "form_fill_import"
          ? 900
          : input.purpose === "table_template_import"
            ? 1400
            : input.purpose === "tbot_chat"
              ? resolveTbotMaxTokens()
              : 4096);

  const dialog =
    input.chatMessages && input.chatMessages.length > 0
      ? input.chatMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      : [{ role: "user" as const, content: input.userContent }];

  const timeoutMs =
    input.purpose === "table_template_import"
      ? 90_000
      : input.purpose === "tbot_chat"
        ? 45_000
        : 60_000;
  const signal = AbortSignal.timeout(timeoutMs);
  const systemContent = systemParts.join("");
  const modelsToTry =
    provider === "openrouter" && input.purpose === "tbot_chat"
      ? [primaryModel, ...resolveOpenRouterTbotFallbackModels(primaryModel)]
      : [primaryModel];

  try {
    let lastError = "Ошибка ИИ.";

    for (const model of modelsToTry) {
      const body = buildChatCompletionBody({
        model,
        provider,
        systemContent,
        dialog,
        temperature,
        max_tokens,
      });

      let upstream: Response;
      if (provider === "gigachat") {
        const token = await getGigachatAccessToken();
        upstream = await fetchGigachat(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body,
          signal,
        });
      } else {
        if (!openAiStyleKey) {
          return { ok: false, error: aiNotConfiguredError() };
        }
        upstream = await openAiFetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiStyleKey}`,
            ...resolveOpenAiStyleExtraHeaders(),
          },
          body,
          signal,
        });
      }

      const data = (await upstream.json()) as {
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
      };

      if (!upstream.ok) {
        const msg = data.error?.message ?? `Ошибка ИИ (${upstream.status})`;
        lastError = msg;
        if (
          provider === "openrouter" &&
          input.purpose === "tbot_chat" &&
          shouldRetryOpenRouterModel(upstream.status)
        ) {
          continue;
        }
        if (isOpenAiGeoBlockMessage(msg) && provider === "openai" && !resolveOpenAiProxyUrl()) {
          return {
            ok: false,
            error: `${msg} Добавьте OPENAI_HTTPS_PROXY (прокси в США/ЕС) в .env сервера.`,
          };
        }
        return { ok: false, error: msg };
      }

      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        lastError = "Пустой ответ от ИИ.";
        continue;
      }
      return { ok: true, reply };
    }

    return { ok: false, error: lastError };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Сеть недоступна." };
  }
}
