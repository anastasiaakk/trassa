import { PORTAL_KV, PORTAL_LOCAL_KEYS } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";
import type { FormAlert, FormAlertKind, FormAlertsStore } from "../types/formAlerts";
import { showFormBrowserNotification } from "./formBrowserNotify";

const STORAGE_KEY = "trassa-form-alerts-v1";
const MAX_ALERTS = 400;

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `falert-${globalThis.crypto.randomUUID()}`;
  }
  return `falert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parse(raw: string | null): FormAlertsStore {
  if (!raw) return { version: 1, alerts: [] };
  try {
    const data = JSON.parse(raw) as Partial<FormAlertsStore>;
    return {
      version: 1,
      alerts: Array.isArray(data.alerts) ? data.alerts : [],
    };
  } catch {
    return { version: 1, alerts: [] };
  }
}

export function loadFormAlerts(): FormAlertsStore {
  try {
    const portal = localStorage.getItem(PORTAL_LOCAL_KEYS[PORTAL_KV.FORM_ALERTS]);
    if (portal) return parse(portal);
    return parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return { version: 1, alerts: [] };
  }
}

export function saveFormAlerts(store: FormAlertsStore): void {
  const trimmed = { version: 1 as const, alerts: store.alerts.slice(-MAX_ALERTS) };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
  pushPortalKv(PORTAL_KV.FORM_ALERTS, trimmed);
  window.dispatchEvent(new CustomEvent("trassa-form-alerts-changed"));
}

export function pushFormAlert(input: {
  audience: "contractor" | "rador";
  emailNorm?: string;
  templateId: string;
  templateTitle: string;
  kind: FormAlertKind;
  message: string;
  dueAt?: string | null;
  snapshotId?: string;
  dedupeKey?: string;
}): FormAlert {
  const store = loadFormAlerts();
  const dedupe =
    input.dedupeKey ??
    `${input.kind}:${input.templateId}:${input.emailNorm ?? "rador"}:${input.snapshotId ?? ""}`;
  const existing = store.alerts.find(
    (a) =>
      `${a.kind}:${a.templateId}:${a.emailNorm ?? "rador"}:${a.snapshotId ?? ""}` === dedupe
  );
  if (existing) return existing;

  const item: FormAlert = {
    id: newId(),
    audience: input.audience,
    emailNorm: input.emailNorm?.trim().toLowerCase(),
    templateId: input.templateId,
    templateTitle: input.templateTitle,
    kind: input.kind,
    message: input.message,
    createdAt: new Date().toISOString(),
    read: false,
    dueAt: input.dueAt ?? null,
    snapshotId: input.snapshotId,
  };
  store.alerts.unshift(item);
  saveFormAlerts(store);
  showFormBrowserNotification(item);
  return item;
}

export function listContractorAlerts(emailNorm: string): FormAlert[] {
  const norm = emailNorm.trim().toLowerCase();
  return loadFormAlerts().alerts.filter(
    (a) => a.audience === "contractor" && a.emailNorm === norm
  );
}

export function countUnreadContractorAlerts(emailNorm: string): number {
  return listContractorAlerts(emailNorm).filter((a) => !a.read).length;
}

export function listRadorAlerts(): FormAlert[] {
  return loadFormAlerts().alerts.filter((a) => a.audience === "rador");
}

export function countUnreadRadorAlerts(): number {
  return listRadorAlerts().filter((a) => !a.read).length;
}

export function markFormAlertRead(id: string): void {
  const store = loadFormAlerts();
  const idx = store.alerts.findIndex((a) => a.id === id);
  if (idx < 0) return;
  store.alerts[idx] = { ...store.alerts[idx], read: true };
  saveFormAlerts(store);
}

export function markAllContractorAlertsRead(emailNorm: string): void {
  const norm = emailNorm.trim().toLowerCase();
  const store = loadFormAlerts();
  let changed = false;
  store.alerts = store.alerts.map((a) => {
    if (a.audience === "contractor" && a.emailNorm === norm && !a.read) {
      changed = true;
      return { ...a, read: true };
    }
    return a;
  });
  if (changed) saveFormAlerts(store);
}
