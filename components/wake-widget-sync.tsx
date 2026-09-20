import { useEffect, useSyncExternalStore } from 'react';
import { useDevicesStore } from '@/store/devices';
import { useWakeWidgetStore } from '@/store/wake-widget';
import { getWakeWidgetUnavailableReason, syncWakeWidget } from '@/modules/wol-sender';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { resolveBroadcastIp } from '@/lib/network-profiles';
import { useDeviceDataReady } from '@/lib/device-data';

const serverHydrated = () => false;

export function WakeWidgetSync() {
  const selectedId = useWakeWidgetStore((state) => state.selectedDeviceId);
  const setSyncError = useWakeWidgetStore((state) => state.setSyncError);
  const selected = useDevicesStore((state) => state.devices.find((device) => device.id === selectedId));
  const devicesReady = useDeviceDataReady();
  const profiles = useNetworkProfilesStore(state => state.profiles);
  const selectionReady = useSyncExternalStore(useWakeWidgetStore.persist.onFinishHydration, useWakeWidgetStore.persist.hasHydrated, serverHydrated);
  const { id, name, macAddress } = selected ?? {};
  const broadcastIp = selected ? resolveBroadcastIp(selected, profiles) : undefined;

  useEffect(() => {
    if (!devicesReady || !selectionReady || getWakeWidgetUnavailableReason()) return;
    let active = true;
    void syncWakeWidget(id && name && macAddress && broadcastIp ? { id, name, macAddress, broadcastIp } : null)
      .then(() => { if (active) setSyncError(null); })
      .catch(() => { if (active) setSyncError('The home-screen widget could not be updated. Reopen POWL to try again.'); });
    return () => { active = false; };
  }, [devicesReady, selectionReady, id, name, macAddress, broadcastIp, setSyncError]);

  return null;
}
