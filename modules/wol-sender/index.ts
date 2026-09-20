import WolSenderModule from './src/WolSenderModule';
import type { SendMagicPacketOptions } from './src/WolSender.types';

export function getWakeUnavailableReason(): string | null {
  return WolSenderModule
    ? null
    : 'Wake requires an Android app build with Wake-on-LAN support.';
}

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
  if (!WolSenderModule) {
    throw new Error(getWakeUnavailableReason()!);
  }
  return WolSenderModule.sendMagicPacket(macAddress, broadcastIp);
}

export type { SendMagicPacketOptions };

export type WakeWidgetDevice = { id: string; name: string; macAddress: string; broadcastIp: string };

export function getWakeWidgetUnavailableReason(): string | null {
  return typeof WolSenderModule?.syncWakeWidget === 'function' && typeof WolSenderModule?.requestPinWakeWidget === 'function'
    ? null
    : 'Home-screen widgets require an Android build with widget support.';
}

// Serialize updates so a removed or edited device cannot be overwritten by an older sync.
let widgetSync: Promise<void> = Promise.resolve();
export function syncWakeWidget(device: WakeWidgetDevice | null): Promise<void> {
  widgetSync = widgetSync.catch(() => {}).then(async () => {
    if (!WolSenderModule?.syncWakeWidget) throw new Error(getWakeWidgetUnavailableReason()!);
    await WolSenderModule.syncWakeWidget(device?.id ?? null, device?.name ?? null, device?.macAddress ?? null, device?.broadcastIp ?? null);
  });
  return widgetSync;
}

export async function requestPinWakeWidget(): Promise<boolean> {
  if (!WolSenderModule?.requestPinWakeWidget) throw new Error(getWakeWidgetUnavailableReason()!);
  await widgetSync;
  return WolSenderModule.requestPinWakeWidget();
}
