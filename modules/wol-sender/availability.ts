import Native from './src/WolSenderModule';
import type { DiscoveryEvent, NetworkState } from '@/lib/availability';

export function availabilityUnavailableReason(): string | undefined {
  return typeof Native?.probeAvailability === 'function' && typeof Native?.startAvailabilityDiscovery === 'function'
    ? undefined : 'Status checks require an Android build with availability support.';
}
export const availabilityNative = {
  startNetwork: async () => { await Native?.startAvailabilityNetwork?.(); },
  stopNetwork: async () => { await Native?.stopAvailabilityNetwork?.(); },
  discover: async (id: string, types: string[]) => {
    if (availabilityUnavailableReason()) throw new Error(availabilityUnavailableReason());
    await Native!.startAvailabilityDiscovery!(id, types);
  },
  stopDiscovery: async (id: string) => { await Native?.stopAvailabilityDiscovery?.(id); },
  probe: async (id: string, ip: string, port?: number) => {
    if (!Native?.probeAvailability) throw new Error(availabilityUnavailableReason());
    return Native.probeAvailability(id, ip, port ?? null);
  },
  cancel: (id: string) => { void Native?.cancelAvailabilityProbe?.(id).catch(() => {}); },
  onDiscovery: (listener: (event: DiscoveryEvent) => void) => availabilityUnavailableReason() ? undefined : Native?.addListener('onAvailabilityDiscovery', listener),
  onNetwork: (listener: (event: NetworkState) => void) => availabilityUnavailableReason() ? undefined : Native?.addListener('onAvailabilityNetwork', listener),
};
