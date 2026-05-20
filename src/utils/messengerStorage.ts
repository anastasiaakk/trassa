import { PORTAL_KV } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";

export const MESSENGER_STORE_KEY = "trassa-messenger-v1";
export const MESSENGER_PEERS_KEY = "trassa-messenger-peers-v1";

export function saveMessengerStore(data: Record<string, unknown>): void {
  pushPortalKv(PORTAL_KV.MESSENGER, data);
}

export function saveMessengerPeers(peers: unknown[]): void {
  pushPortalKv(PORTAL_KV.MESSENGER_PEERS, peers);
}
