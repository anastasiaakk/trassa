/** Непрочитанные входящие в мессенджере (индикатор на Т-боте, не на иконке чата). */

import { ensureMessengerUidInProfile } from "./messengerInvite";
import { isMessengerHiddenForMe } from "./messengerHiddenForMe";

export const MSGR_SEEN_KEY = "trassa-msgr-seen";
const MESSENGER_STORE = "trassa-messenger-v1";

export function readMessengerSeenAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const n = Number(localStorage.getItem(MSGR_SEEN_KEY));
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* ignore */
  }
  return Date.now();
}

export function markMessengerInboxSeen(at = Date.now()): void {
  try {
    localStorage.setItem(MSGR_SEEN_KEY, String(at));
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("trassa-messenger-updated"));
  }
}

export function hasMessengerInboxUnread(seenAt = readMessengerSeenAt()): boolean {
  const myUid = ensureMessengerUidInProfile();
  try {
    const raw = localStorage.getItem(MESSENGER_STORE);
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<
      string,
      Array<{ author: string; createdAt: string; id?: string }>
    >;
    for (const tid of Object.keys(data)) {
      for (const m of data[tid] ?? []) {
        if (m.author !== myUid && new Date(m.createdAt).getTime() > seenAt) {
          if (m.id && isMessengerHiddenForMe(tid, m.id)) continue;
          return true;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}
