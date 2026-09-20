import { useSyncExternalStore } from 'react';
import { useDevicesStore } from '@/store/devices';
import { useNetworkProfilesStore } from '@/store/network-profiles';

/** Every destination-dependent action must wait for both independent storage reads. */
export function isDeviceDataReady(): boolean {
  return useDevicesStore.persist.hasHydrated() && useNetworkProfilesStore.persist.hasHydrated();
}
function subscribe(listener: () => void) {
  const unsubscribe = [
    useDevicesStore.persist.onHydrate(listener),
    useDevicesStore.persist.onFinishHydration(listener),
    useNetworkProfilesStore.persist.onHydrate(listener),
    useNetworkProfilesStore.persist.onFinishHydration(listener),
  ];
  return () => unsubscribe.forEach((remove) => remove());
}
export function useDeviceDataReady() {
  return useSyncExternalStore(subscribe, isDeviceDataReady, () => false);
}
export async function reloadDeviceData() {
  await Promise.all([useDevicesStore.persist.rehydrate(), useNetworkProfilesStore.persist.rehydrate()]);
}
