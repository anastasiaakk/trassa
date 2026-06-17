import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/adminAuth.js";
import { callOpenAiChat } from "../adminAiCore.js";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(12000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  context: z.string().max(20000).optional(),
});

const fillHintsSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  layout: z.enum(["form", "grid"]).optional(),
  deadlineAt: z.string().nullable().optional(),
  columns: z
    .array(
      z.object({
        title: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
        hint: z.string().optional(),
      })
    )
    .min(1)
    .max(80),
});

export const adminAiRouter = Router();

adminAiRouter.post("/ai/chat", requireAdmin, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректный запрос к ИИ." });
    return;
  }

  const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    res.status(400).json({ ok: false, error: "Нужно сообщение пользователя." });
    return;
  }

  const history = parsed.data.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "Администратор" : "ИИ"}: ${m.content}`)
    .join("\n\n");

  const userContent =
    parsed.data.messages.length > 1
      ? `История диалога:\n${history}\n\nОтветь на последний запрос администратора.`
      : lastUser.content;

  const result = await callOpenAiChat({
    purpose: "admin_chat",
    userContent,
    context: parsed.data.context,
  });

  if (!result.ok) {
    res.status(result.error.includes("не настроен") ? 503 : 502).json(result);
    return;
  }
  res.json({ ok: true, reply: result.reply });
});

const designAiSchema = z.object({
  messages: z.array(messageSchema).min(1).max(24),
  currentTokens: z.record(z.string(), z.unknown()).optional(),
});

adminAiRouter.post("/ai/design-system", requireAdmin, async (req: Request, res: Response) => {
  const parsed = designAiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректный запрос к ИИ." });
    return;
  }

  const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    res.status(400).json({ ok: false, error: "Нужно сообщение пользователя." });
    return;
  }

  const history = parsed.data.messages
    .filter((m) => m.role !== "system")
    .map((m) => `${m.role === "user" ? "Администратор" : "ИИ"}: ${m.content}`)
    .join("\n\n");

  const userContent =
    parsed.data.messages.length > 1
      ? `История:\n${history}\n\nОтветь на последний запрос.`
      : lastUser.content;

  const context = parsed.data.currentTokens
    ? `Текущие токены дизайн-системы:\n${JSON.stringify(parsed.data.currentTokens, null, 2)}`
    : undefined;

  const result = await callOpenAiChat({
    purpose: "design_system",
    userContent,
    context,
    temperature: 0.2,
    maxTokens: 1200,
  });

  if (!result.ok) {
    res.status(result.error.includes("не настроен") ? 503 : 502).json(result);
    return;
  }
  res.json({ ok: true, reply: result.reply });
});

adminAiRouter.post("/ai/fill-hints", requireAdmin, async (req: Request, res: Response) => {
  const parsed = fillHintsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные шаблона." });
    return;
  }

  const cols = parsed.data.columns
    .map(
      (c, i) =>
        `${i + 1}. «${c.title}» — тип ${c.type}${c.required === false ? ", необязательно" : ", обязательно"}${c.hint ? `; подсказка столбца: ${c.hint}` : ""}`
    )
    .join("\n");

  const userContent = [
    `Шаблон: «${parsed.data.title}»`,
    parsed.data.description?.trim() ? `Описание: ${parsed.data.description.trim()}` : "",
    `Режим: ${parsed.data.layout === "grid" ? "таблица (много строк)" : "одна форма"}`,
    parsed.data.deadlineAt
      ? `Срок сдачи: ${new Date(parsed.data.deadlineAt).toLocaleString("ru-RU")}`
      : "Срок не задан",
    `Столбцы:\n${cols}`,
    "Сформируй инструкцию для подрядчика по правилам из system prompt.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callOpenAiChat({
    purpose: "fill_hints",
    userContent,
    temperature: 0.15,
    maxTokens: 1400,
  });

  if (!result.ok) {
    res.status(result.error.includes("не настроен") ? 503 : 502).json(result);
    return;
  }
  res.json({ ok: true, hints: result.reply });
});
