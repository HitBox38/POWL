import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useDevicesStore } from '@/store/devices';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { useQuickActionsStore } from '@/store/quick-actions';
import { useDeviceDataReady } from '@/lib/device-data';
import { quickActionsConfig } from '@/lib/quick-actions';
import { quickActionsUnavailableReason, syncQuickActions } from '@/modules/wol-sender/quick-actions';

const serverReady = () => false;

export function QuickActionsSync() {
  const devices = useDevicesStore(state => state.devices);
  const profiles = useNetworkProfilesStore(state => state.profiles);
  const activeProfileId = useNetworkProfilesStore(state => state.activeProfileId);
  const selectedId = useQuickActionsStore(state => state.selectedDeviceId);
  const ready = useDeviceDataReady();
  const selectionReady = useSyncExternalStore(useQuickActionsStore.persist.onFinishHydration, useQuickActionsStore.persist.hasHydrated, serverReady);
  // A primitive payload avoids republishing launcher shortcuts on every wake/status update.
  const config = quickActionsConfig(devices, profiles, activeProfileId, selectedId);
  useEffect(() => {
    if (!ready || !selectionReady || quickActionsUnavailableReason()) return;
    let active = true;
    const sync = () => {
      void syncQuickActions(config).then(() => {
        if (active) useQuickActionsStore.getState().setSyncError(null);
      }).catch(() => {
        if (active) useQuickActionsStore.getState().setSyncError('Quick access could not be updated. Reopen POWL to retry.');
      });
    };
    sync();
    const subscription = AppState.addEventListener('change', value => { if (value === 'active') sync(); });
    return () => { active = false; subscription.remove(); };
  }, [ready, selectionReady, config]);
  return null;
}
