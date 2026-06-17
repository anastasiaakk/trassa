import {
  MESSENGER_PEERS_KEY,
  MESSENGER_STORE_KEY,
  saveMessengerPeers,
  saveMessengerStore,
} from "./messengerStorage";
import { SESSION_ACTIVE_PEER } from "./messengerInvite";
import type { MessengerMessage, MessengerPeer } from "../types/messenger";

export const MAX_MESSENGER_ATTACH_BYTES = 1_800_000;

export const DEFAULT_MESSENGER_PEERS: MessengerPeer[] = [
  { id: "p1", name: "Елена Козлова", role: "Координатор ТОУАД" },
  { id: "p2", name: "Дмитрий Волков", role: "Представитель подрядчика" },
  { id: "p3", name: "Анна Михайлова", role: "Студенческий клуб РАДОР" },
  { id: "p4", name: "Сергей Никифоров", role: "Куратор документооборота" },
];

function defaultSeedText(peerIndex: number) {
  if (peerIndex === 0) return "Добрый день! Напоминаю: свод по командам нужен до пятницы.";
  if (peerIndex === 1) return "Материалы по объекту отправил в общую папку, посмотрите, пожалуйста.";
  return "Здравствуйте! Готовы подключиться к встрече в четверг в 15:00.";
}

export function loadMessengerPeers(): MessengerPeer[] {
  try {
    const raw = localStorage.getItem(MESSENGER_PEERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as MessengerPeer[];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_MESSENGER_PEERS.map((peer) => ({ ...peer }));
}

export function persistMessengerPeers(peers: MessengerPeer[]) {
  try {
    saveMessengerPeers(peers);
  } catch {
    /* ignore */
  }
}

export function loadMessengerThreadStore(
  peerIds: string[],
): Record<string, MessengerMessage[]> {
  let stored: Record<string, MessengerMessage[]> | null = null;
  try {
    const raw = localStorage.getItem(MESSENGER_STORE_KEY);
    if (raw) stored = JSON.parse(raw) as Record<string, MessengerMessage[]>;
  } catch {
    /* ignore */
  }
  const t0 = Date.now();
  const out: Record<string, MessengerMessage[]> = {};
  peerIds.forEach((id) => {
    const existing = stored?.[id];
    if (Array.isArray(existing)) {
      out[id] = existing;
      return;
    }
    const def = DEFAULT_MESSENGER_PEERS.find((peer) => peer.id === id);
    if (def) {
      const idx = DEFAULT_MESSENGER_PEERS.findIndex((peer) => peer.id === id);
      out[id] = [
        {
          id: `seed-${id}-1`,
          threadId: id,
          author: id,
          text: defaultSeedText(idx),
          createdAt: new Date(t0 - (idx + 1) * 3600000).toISOString(),
        },
      ];
    } else {
      out[id] = [];
    }
  });
  return out;
}

export function persistMessengerMessages(data: Record<string, MessengerMessage[]>) {
  try {
    saveMessengerStore(data as Record<string, unknown>);
  } catch {
    /* ignore */
  }
}

/** Синхронное чтение списка и потоков после applyMessengerInvitePayload. */
export function readMessengerStateFromStorage(): {
  peers: MessengerPeer[];
  byThread: Record<string, MessengerMessage[]>;
  activeId: string;
} {
  const peers = loadMessengerPeers();
  const byThread = loadMessengerThreadStore(peers.map((peer) => peer.id));
  let forced: string | null = null;
  try {
    forced = sessionStorage.getItem(SESSION_ACTIVE_PEER);
    if (forced) sessionStorage.removeItem(SESSION_ACTIVE_PEER);
  } catch {
    /* ignore */
  }
  const activeId =
    forced && peers.some((peer) => peer.id === forced) ? forced : peers[0]?.id ?? "p1";
  return { peers, byThread, activeId };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}
