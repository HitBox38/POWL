import WolSenderModule from './src/WolSenderModule';
import type { SendMagicPacketOptions } from './src/WolSender.types';

/**
 * Sends a Wake-on-LAN magic packet over UDP to port 9.
 *
 * Android only. Requires INTERNET and CHANGE_WIFI_MULTICAST_STATE permissions
 * (added automatically by the withWolSender config plugin).
 *
 * @example
 * await sendMagicPacket({ macAddress: 'AA:BB:CC:DD:EE:FF' });
 * await sendMagicPacket({ macAddress: 'AA:BB:CC:DD:EE:FF', broadcastIp: '192.168.1.255' });
 */
export async function sendMagicPacket({
  macAddress,
  broadcastIp = '255.255.255.255',
}: SendMagicPacketOptions): Promise<void> {
  return WolSenderModule.sendMagicPacket(macAddress, broadcastIp);
}

export type { SendMagicPacketOptions };
