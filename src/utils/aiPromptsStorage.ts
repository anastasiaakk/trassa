import { PORTAL_KV } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";
import type { AiPromptEntry, AiPromptLibrary } from "../types/adminForms";

const STORAGE_KEY = "trassa-ai-prompt-library-v1";

const EMPTY: AiPromptLibrary = { version: 1, prompts: [] };

const DEFAULT_PROMPTS: Omit<AiPromptEntry, "id" | "updatedAt">[] = [
  {
    title: "Распределить студентов по подрядчикам",
    body: "Распредели студентов по подрядчикам с учётом готовности к переезду. Верни таблицу: студент, подрядчик, обоснование.",
    tags: ["распределение", "студенты"],
  },
  {
    title: "Создать шаблон таблицы",
    body: "Создай шаблон таблицы для сбора данных от подрядчиков: название, столбцы, типы полей, срок сдачи.",
    tags: ["таблицы", "шаблон"],
  },
  {
    title: "Сводка по заполнению",
    body: "Проанализируй процент заполнения таблиц подрядчиками и выдели отстающих.",
    tags: ["мониторинг"],
  },
];

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `prompt-${globalThis.crypto.randomUUID()}`;
  }
  return `prompt-${Date.now()}`;
}

function parse(raw: string | null): AiPromptLibrary {
  if (!raw) return seedDefaults();
  try {
    const data = JSON.parse(raw) as Partial<AiPromptLibrary>;
    if (!Array.isArray(data.prompts)) return seedDefaults();
    return { version: 1, prompts: data.prompts };
  } catch {
    return seedDefaults();
  }
}

function seedDefaults(): AiPromptLibrary {
  const now = new Date().toISOString();
  return {
    version: 1,
    prompts: DEFAULT_PROMPTS.map((p) => ({
      ...p,
      id: newId(),
      updatedAt: now,
    })),
  };
}

export function loadAiPromptLibrary(): AiPromptLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const lib = parse(raw);
    if (!raw && lib.prompts.length > 0) {
      saveAiPromptLibrary(lib);
    }
    return lib;
  } catch {
    return seedDefaults();
  }
}

export function saveAiPromptLibrary(lib: AiPromptLibrary): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch {
    /* ignore */
  }
  pushPortalKv(PORTAL_KV.AI_PROMPT_LIBRARY, lib);
  window.dispatchEvent(new CustomEvent("trassa-ai-prompts-changed"));
}

export function upsertAiPrompt(
  patch: Partial<AiPromptEntry> & { title: string; body: string }
): AiPromptEntry {
  const lib = loadAiPromptLibrary();
  const now = new Date().toISOString();
  if (patch.id) {
    const idx = lib.prompts.findIndex((p) => p.id === patch.id);
    if (idx >= 0) {
      const item: AiPromptEntry = {
        ...lib.prompts[idx],
        title: patch.title.trim(),
        body: patch.body.trim(),
        tags: patch.tags ?? lib.prompts[idx].tags,
        updatedAt: now,
      };
      lib.prompts[idx] = item;
      saveAiPromptLibrary(lib);
      return item;
    }
  }
  const item: AiPromptEntry = {
    id: newId(),
    title: patch.title.trim(),
    body: patch.body.trim(),
    tags: patch.tags ?? [],
    updatedAt: now,
  };
  lib.prompts.unshift(item);
  saveAiPromptLibrary(lib);
  return item;
}

export function removeAiPrompt(id: string): void {
  const lib = loadAiPromptLibrary();
  lib.prompts = lib.prompts.filter((p) => p.id !== id);
  saveAiPromptLibrary(lib);
}
