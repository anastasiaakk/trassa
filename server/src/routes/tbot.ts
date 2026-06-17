import type { Request, Response } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db } from "../db.js";
import { isAiConfigured, resolveAiModel, resolveAiProvider, resolveAiProviderLabel } from "../aiConfig.js";
import { callOpenAiChat } from "../adminAiCore.js";
import { resolveOpenAiProxyUrl } from "../openAiHttp.js";
import { readTokenFromRequest, verifyAccessToken } from "../middleware/auth.js";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

export const tbotRouter = Router();

const tbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.TBOT_RATE_LIMIT_MAX) || 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Слишком много сообщений Т-боту. Подождите." },
});

function optionalUserContext(req: Request): string {
  try {
    const t = readTokenFromRequest(req);
    if (!t) return "";
    const payload = verifyAccessToken(t);
    const row = db
      .prepare("SELECT profile_json FROM users WHERE email_norm = ?")
      .get(payload.emailNorm) as { profile_json: string } | undefined;
    if (!row) {
      return `Пользователь вошёл (${payload.emailNorm}).`;
    }
    const p = JSON.parse(row.profile_json) as {
      firstName?: string;
      lastName?: string;
      roleLabel?: string;
      contractorCompanyName?: string;
    };
    const name = `${p.lastName ?? ""} ${p.firstName ?? ""}`.trim();
    const parts = [
      name ? `Имя: ${name}` : "",
      p.roleLabel ? `Роль: ${p.roleLabel}` : "",
      p.contractorCompanyName ? `Организация: ${p.contractorCompanyName}` : "",
      `E-mail: ${payload.emailNorm}`,
    ].filter(Boolean);
    return parts.join(". ");
  } catch {
    return "";
  }
}

tbotRouter.get("/tbot/status", (_req: Request, res: Response) => {
  const provider = resolveAiProvider();
  res.json({
    ok: true,
    configured: isAiConfigured(),
    provider,
    providerLabel: resolveAiProviderLabel(),
    model: resolveAiModel("tbot_chat"),
    proxyConfigured: provider === "openai" && Boolean(resolveOpenAiProxyUrl()),
  });
});

tbotRouter.post("/tbot/chat", tbotLimiter, async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректный запрос." });
    return;
  }

  const userCtx = optionalUserContext(req);
  const context = userCtx ? `Профиль собеседника: ${userCtx}` : "";

  const chatMessages = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = await callOpenAiChat({
    purpose: "tbot_chat",
    userContent: chatMessages[chatMessages.length - 1]?.content ?? "",
    chatMessages,
    context,
    temperature: 0.4,
  });

  if (!result.ok) {
    res.status(result.error.includes("не настроен") ? 503 : 502).json(result);
    return;
  }

  res.json({ ok: true, reply: result.reply });
});
