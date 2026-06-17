import { SESSION_TOAST } from "./messengerInvite";
import { readMessengerStateFromStorage } from "./messengerThreadStore";

export type MessengerInviteToast = { mode: "added" | "exists"; name: string };

export function readInviteToastOnce(): MessengerInviteToast | null {
  try {
    const raw = sessionStorage.getItem(SESSION_TOAST);
    if (raw) sessionStorage.removeItem(SESSION_TOAST);
    if (!raw) return null;
    const o = JSON.parse(raw) as { mode?: string; name?: string };
    if (o.mode === "added" && typeof o.name === "string") return { mode: "added", name: o.name };
    if (o.mode === "exists" && typeof o.name === "string") return { mode: "exists", name: o.name };
    return null;
  } catch {
    return null;
  }
}

export function computeInitialMessengerState() {
  return readMessengerStateFromStorage();
}
