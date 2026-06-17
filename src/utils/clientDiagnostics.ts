/**
 * Локальный журнал сбоев + отправка на API (если доступен).
 */

import { getApiBase } from "../api/authApi";
import { isAuthApiEnabled } from "./authMode";
import { fetchWithTimeout } from "../api/fetchWithTimeout";

const EVENTS_KEY = "trassa-client-events-v1";
const MAX_LOCAL = 400;

export type ClientEventKind = "error" | "crash" | "rejection";

export type ClientEventRecord = {
  id: string;
  kind: ClientEventKind;
  message: string;
  createdAt: string;
};

function readLocal(): ClientEventRecord[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { events?: ClientEventRecord[] };
    return Array.isArray(parsed?.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

function writeLocal(events: ClientEventRecord[]): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify({ events: events.slice(-MAX_LOCAL) }));
  } catch {
    /* ignore */
  }
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function listLocalClientEventTimes(): string[] {
  return readLocal().map((e) => e.createdAt);
}

/** Последние события из localStorage (новые сверху). */
export function listLocalClientEvents(limit = 100): ClientEventRecord[] {
  return [...readLocal()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function clearLocalClientEvents(): void {
  writeLocal([]);
}

export function recordClientEvent(
  kind: ClientEventKind,
  message: string
): void {
  const trimmed = message.trim().slice(0, 500) || kind;
  const entry: ClientEventRecord = {
    id: newId(),
    kind,
    message: trimmed,
    createdAt: new Date().toISOString(),
  };
  writeLocal([...readLocal(), entry]);

  if (!isAuthApiEnabled()) return;
  const base = getApiBase();
  void fetchWithTimeout(`${base}/api/diagnostics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, message: trimmed }),
  }).catch(() => {
    /* офлайн — остаётся только local */
  });
}

let wired = false;

/** Глобальные window.onerror и unhandledrejection. */
export function wireClientDiagnostics(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;

  window.addEventListener("error", (ev) => {
    const msg = ev.message || (ev.error instanceof Error ? ev.error.message : "Ошибка");
    recordClientEvent("error", msg);
  });

  window.addEventListener("unhandledrejection", (ev) => {
    const reason = ev.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Необработанное отклонение промиса";
    recordClientEvent("rejection", msg);
  });
}
