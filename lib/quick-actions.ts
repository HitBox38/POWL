import { getNetworkMismatch, resolveBroadcastIp, type NetworkProfile } from './network-profiles.ts';

type QuickDevice = { id: string; name: string; macAddress: string; broadcastIp: string; networkProfileId?: string; isFavorite?: boolean };

/** Keep destinations out of launch intents; native actions resolve IDs against this current snapshot. */
export function quickActionsConfig(devices: QuickDevice[], profiles: NetworkProfile[], activeProfileId: string | null, selectedId: string | null) {
  return JSON.stringify({
    selectedId: devices.some(device => device.id === selectedId) ? selectedId : null,
    devices: devices.filter(device => device.isFavorite || device.id === selectedId).map(device => ({
      id: device.id, name: device.name, macAddress: device.macAddress,
      broadcastIp: resolveBroadcastIp(device, profiles), favorite: !!device.isFavorite,
      blocker: getNetworkMismatch(device, profiles, activeProfileId),
    })),
  });
}
