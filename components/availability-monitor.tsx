import { useEffect } from 'react';
import { AppState } from 'react-native';
import { AvailabilityMonitor as Monitor } from '@/lib/availability-monitor';
import { getNetworkMismatch } from '@/lib/network-profiles';
import { availabilityNative as native, availabilityUnavailableReason } from '@/modules/wol-sender/availability';
import { useDevicesStore } from '@/store/devices';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { publishAvailability, useAvailabilityStore } from '@/store/availability';
import type { NetworkState } from '@/lib/availability';

/** Mounted once, inside DeviceDataGate, independently of route/card lifetimes. */
export function AvailabilityMonitor() {
  useEffect(() => {
    let active = AppState.currentState === 'active';
    let disposed = false;
    let network: NetworkState = { key: '', available: false, reason: 'Checking local network…' };
    let session: string | undefined;
    let sequence = 0;
    let discoveryKey = '';
    let discoveryRetryAt = 0;
    const monitor = new Monitor({ probe: native.probe, cancel: native.cancel, publish: publishAvailability, now: Date.now });
    const unavailable = availabilityUnavailableReason();

    const syncDevices = () => {
      const profiles = useNetworkProfilesStore.getState();
      monitor.setDevices(useDevicesStore.getState().devices.map(device => ({
        id: device.id, target: device.statusTarget,
        blocker: getNetworkMismatch(device, profiles.profiles, profiles.activeProfileId) ?? undefined,
        revision: JSON.stringify([device.name, device.macAddress, device.broadcastIp, device.statusTarget, device.networkProfileId]),
      })));
      const types = [...new Set(useDevicesStore.getState().devices.flatMap(device =>
        device.statusTarget?.kind === 'service' && !getNetworkMismatch(device, profiles.profiles, profiles.activeProfileId)
          ? [device.statusTarget.serviceType] : []))].sort();
      const key = JSON.stringify([active, network.key, network.available, profiles.activeProfileId, profiles.profiles, types]);
      if (key === discoveryKey) return;
      discoveryKey = key;
      discoveryRetryAt = 0;
      if (session) { void native.stopDiscovery(session).catch(() => {}); session = undefined; }
      monitor.setEnvironment(active, unavailable ?? (!network.available ? network.reason ?? 'Connect to a local Wi-Fi or Ethernet network.' : undefined));
      if (active && network.available && !unavailable && types.length) {
        session = `monitor-${Date.now()}-${++sequence}`;
        const current = session;
        void native.discover(current, types).catch(() => {
          if (!disposed && current === session) {
            monitor.discoveryFailed('Discovery could not start. Check network access or use a manual IP.');
            discoveryRetryAt = Date.now() + 30_000;
          }
        });
      }
    };
    const discoverySubscription = native.onDiscovery(event => {
      if (event.sessionId !== session) return;
      if (event.kind === 'error') {
        monitor.discoveryFailed(event.reason ?? 'Discovery failed.');
        discoveryRetryAt = Date.now() + 30_000;
      }
      else if (event.service) monitor.serviceChanged(event.service, event.kind === 'lost');
    });
    const networkSubscription = native.onNetwork(state => {
      if (disposed) return;
      network = state;
      useAvailabilityStore.setState({ network });
      syncDevices();
    });
    const devicesSubscription = useDevicesStore.subscribe((state, previous) => {
      syncDevices();
      for (const device of state.devices) {
        const old = previous.devices.find(d => d.id === device.id);
        if (device.lastWakeRequest?.result === 'sent' && device.lastWakeRequest !== old?.lastWakeRequest) monitor.wakeSent(device.id);
      }
    });
    const profilesSubscription = useNetworkProfilesStore.subscribe(syncDevices);
    const appSubscription = AppState.addEventListener('change', state => {
      active = state === 'active';
      if (!active) {
        network = { key: '', available: false, reason: 'Checks resume when POWL is open.' };
        useAvailabilityStore.setState({ network });
        syncDevices();
        void native.stopNetwork().catch(() => {});
      } else {
        syncDevices();
        void native.startNetwork().catch(networkError);
      }
    });
    function networkError() {
      if (disposed) return;
      network = { key: 'error', available: false, reason: 'Local network access is unavailable. Check Android permissions.' };
      useAvailabilityStore.setState({ network });
      syncDevices();
    }
    useAvailabilityStore.setState({ checkNow: id => {
      if (discoveryRetryAt) { discoveryRetryAt = 0; discoveryKey = ''; syncDevices(); }
      monitor.checkNow(id);
    }, network });
    syncDevices();
    if (active && !unavailable) void native.startNetwork().catch(networkError);
    const timer = setInterval(() => {
      if (active && discoveryRetryAt && discoveryRetryAt <= Date.now()) {
        discoveryRetryAt = 0; discoveryKey = ''; syncDevices();
      }
      monitor.tick();
    }, 1_000);
    return () => {
      disposed = true;
      clearInterval(timer);
      monitor.setEnvironment(false);
      if (session) void native.stopDiscovery(session).catch(() => {});
      void native.stopNetwork().catch(() => {});
      discoverySubscription?.remove(); networkSubscription?.remove();
      devicesSubscription(); profilesSubscription(); appSubscription.remove();
      useAvailabilityStore.setState({ checkNow: () => {}, results: {} });
    };
  }, []);
  return null;
}
