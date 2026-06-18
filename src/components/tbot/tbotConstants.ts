import type { TBotAccessory } from "../tbotAppearance";

export const STORAGE_KEY = "trassa-ai-bubble-pos";
export const PANEL_POS_KEY = "trassa-ai-panel-pos";
export const BUBBLE = 56;
export const MARGIN = 12;
/** Подсказка у иконки Т-бота — только после удержания курсора (мс). */
export const TBOT_ICON_TOOLTIP_DELAY_MS = 1000;
export const DRAG_THRESHOLD = 6;
export const PANEL_W = 400;
export const PANEL_H = 520;
export const SCROLL_BOTTOM_THRESHOLD = 72;
export const TBOT_READ_AI_ID_KEY = "trassa-tbot-read-ai-id";

export const ACCESSORY_OPTIONS: { value: TBotAccessory; label: string }[] = [
  { value: "none", label: "Нет" },
  { value: "glasses", label: "Очки" },
  { value: "starGlasses", label: "Звёздные очки" },
  { value: "headphones", label: "Наушники" },
  { value: "crown", label: "Корона" },
];

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function loadPos(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left: number; top: number };
    if (typeof p.left === "number" && typeof p.top === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function savePos(left: number, top: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

export function loadPanelPos(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(PANEL_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left: number; top: number };
    if (typeof p.left === "number" && typeof p.top === "number") return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function savePanelPos(left: number, top: number) {
  try {
    sessionStorage.setItem(PANEL_POS_KEY, JSON.stringify({ left, top }));
  } catch {
    /* ignore */
  }
}

export type TbotMsg = { id: string; role: "user" | "ai"; text: string; ts: number };

export function lastAiMessageId(messages: TbotMsg[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "ai") return messages[i].id;
  }
  return undefined;
}

export function formatMsgTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
