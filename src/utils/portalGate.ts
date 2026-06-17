import { DEVICE_BAN_MESSAGE, writeCachedDeviceBan } from "../api/deviceAccessApi";

export const PORTAL_GATE_EVENT = "pv2-gate";

export type PortalGateListener = (held: boolean, message: string) => void;

const listeners = new Set<PortalGateListener>();

export function applyPortalGateHold(held: boolean, message = DEVICE_BAN_MESSAGE): void {
  writeCachedDeviceBan(held);
  listeners.forEach((fn) => {
    try {
      fn(held, message);
    } catch {
      /* ignore */
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PORTAL_GATE_EVENT, { detail: { held, message } })
    );
  }
}

export function subscribePortalGate(listener: PortalGateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
