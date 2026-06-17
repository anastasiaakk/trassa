type DeviceAccessPayload = {
  banned: boolean;
};

type Listener = (payload: DeviceAccessPayload) => void;

const channels = new Map<string, Set<Listener>>();

export function subscribeDeviceAccess(deviceId: string, listener: Listener): () => void {
  let set = channels.get(deviceId);
  if (!set) {
    set = new Set();
    channels.set(deviceId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) channels.delete(deviceId);
  };
}

export function broadcastDeviceAccess(deviceIds: Iterable<string>, banned: boolean): void {
  const payload: DeviceAccessPayload = { banned };
  for (const deviceId of deviceIds) {
    const set = channels.get(deviceId);
    if (!set) continue;
    for (const listener of set) {
      try {
        listener(payload);
      } catch {
        /* ignore listener errors */
      }
    }
  }
}
