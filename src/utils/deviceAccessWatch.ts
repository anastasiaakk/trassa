import { DEVICE_BAN_MESSAGE } from "../api/deviceAccessApi";
import { subscribePortalGate } from "./portalGate";

export type DeviceAccessListener = (banned: boolean, message: string) => void;

/**
 * Слушает статус доступа через обычный poll /api/portal/version (PortalSyncProvider).
 * Отдельного SSE / ping / device URL нет.
 */
export function startDeviceAccessWatch(listener: DeviceAccessListener): () => void {
  return subscribePortalGate(listener);
}

export { DEVICE_BAN_MESSAGE };
