import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { DiscoveryEvent, NetworkState, ProbeResult } from '@/lib/availability';

interface WolSenderNativeModule {
  sendMagicPacket(macAddress: string, broadcastIp: string): Promise<void>;
  syncWakeWidget?(id: string | null, name: string | null, macAddress: string | null, broadcastIp: string | null): Promise<void>;
  requestPinWakeWidget?(): Promise<boolean>;
  syncQuickActions?(config: string): Promise<void>;
  requestAddWakeTile?(): Promise<boolean>;
  startAvailabilityNetwork?(): Promise<void>;
  stopAvailabilityNetwork?(): Promise<void>;
  startAvailabilityDiscovery?(sessionId: string, types: string[]): Promise<void>;
  stopAvailabilityDiscovery?(sessionId: string): Promise<void>;
  probeAvailability?(id: string, ip: string, port: number | null): Promise<ProbeResult>;
  cancelAvailabilityProbe?(id: string): Promise<void>;
  addListener(event: 'onAvailabilityDiscovery', listener: (event: DiscoveryEvent) => void): { remove: () => void };
  addListener(event: 'onAvailabilityNetwork', listener: (event: NetworkState) => void): { remove: () => void };
}

export default Platform.OS === 'android'
  ? requireOptionalNativeModule<WolSenderNativeModule>('WolSender')
  : null;
