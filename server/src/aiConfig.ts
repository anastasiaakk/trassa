export type AiProvider = "openai" | "gigachat" | "deepseek" | "openrouter" | "gemini";

export function resolveAiProvider(): AiProvider {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "openrouter") return "openrouter";
  if (explicit === "gemini") return "gemini";
  if (explicit === "deepseek") return "deepseek";
  if (explicit === "gigachat" || explicit === "giga") return "gigachat";
  if (explicit === "openai") return "openai";
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.DEEPSEEK_API_KEY?.trim()) return "deepseek";
  if (process.env.GIGACHAT_AUTH_KEY?.trim()) return "gigachat";
  return "openai";
}

export function isAiConfigured(): boolean {
  const provider = resolveAiProvider();
  if (provider === "gigachat") return Boolean(process.env.GIGACHAT_AUTH_KEY?.trim());
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY?.trim());
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY?.trim());
  if (provider === "deepseek") return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function resolveAiModel(purpose?: string): string {
  const provider = resolveAiProvider();
  const forTbot = purpose === "tbot_chat";
  if (provider === "gigachat") {
    return process.env.GIGACHAT_MODEL?.trim() || "GigaChat-2";
  }
  if (provider === "openrouter") {
    if (forTbot) {
      return (
        process.env.TBOT_AI_MODEL?.trim() ||
        process.env.OPENROUTER_TBOT_MODEL?.trim() ||
        "meta-llama/llama-3.3-70b-instruct:free"
      );
    }
    return process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-oss-120b:free";
  }
  if (provider === "gemini") {
    return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  }
  if (provider === "deepseek") {
    return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
  }
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export function resolveAiProviderLabel(): string {
  const provider = resolveAiProvider();
  if (provider === "gigachat") return "GigaChat";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "gemini") return "Gemini";
  if (provider === "deepseek") return "DeepSeek";
  return "OpenAI";
}

export function resolveAiApiBase(): string {
  const provider = resolveAiProvider();
  if (provider === "gigachat") {
    return (
      process.env.GIGACHAT_API_BASE || "https://gigachat.devices.sberbank.ru/api/v1"
    ).replace(/\/$/, "");
  }
  if (provider === "openrouter") {
    return (process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1").replace(
      /\/$/,
      ""
    );
  }
  if (provider === "gemini") {
    return (
      process.env.GEMINI_API_BASE ||
      "https://generativelanguage.googleapis.com/v1beta/openai"
    ).replace(/\/$/, "");
  }
  if (provider === "deepseek") {
    return (process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com").replace(/\/$/, "");
  }
  return (process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/$/, "");
}

export function resolveOpenAiStyleApiKey(): string | undefined {
  const provider = resolveAiProvider();
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY?.trim();
  if (provider === "gemini") return process.env.GEMINI_API_KEY?.trim();
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY?.trim();
  if (provider === "openai") return process.env.OPENAI_API_KEY?.trim();
  return undefined;
}

/** Доп. заголовки для OpenRouter (рекомендуется документацией). */
export function resolveOpenAiStyleExtraHeaders(): Record<string, string> {
  if (resolveAiProvider() !== "openrouter") return {};
  return {
    "HTTP-Referer":
      process.env.OPENROUTER_APP_URL?.trim() || "https://trassa.duckdns.org",
    "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Trassa Portal",
  };
}

export function resolveTbotMaxTokens(): number {
  const raw = process.env.TBOT_AI_MAX_TOKENS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 128 && n <= 4096) return Math.round(n);
  }
  return 512;
}

/** Запасные модели OpenRouter, если основная недоступна (429/404). */
export function resolveOpenRouterTbotFallbackModels(primary: string): string[] {
  const fallbacks = [
    "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "openai/gpt-oss-120b:free",
  ].filter((m) => m !== primary);
  return fallbacks;
}

export function aiNotConfiguredError(): string {
  const provider = resolveAiProvider();
  if (provider === "gigachat") {
    return "ИИ на сервере не настроен. Задайте GIGACHAT_AUTH_KEY в .env.";
  }
  if (provider === "openrouter") {
    return "ИИ на сервере не настроен. Задайте OPENROUTER_API_KEY (openrouter.ai → Keys, бесплатно).";
  }
  if (provider === "gemini") {
    return "ИИ на сервере не настроен. Задайте GEMINI_API_KEY (aistudio.google.com → Get API key).";
  }
  if (provider === "deepseek") {
    return "ИИ на сервере не настроен. Задайте DEEPSEEK_API_KEY (platform.deepseek.com).";
  }
  return "ИИ на сервере не настроен. Задайте OPENAI_API_KEY в .env сервера.";
}
