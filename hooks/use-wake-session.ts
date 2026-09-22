import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useDevicesStore, type Device } from '@/store/devices';
import { useAvailabilityStore } from '@/store/availability';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { getNetworkMismatch } from '@/lib/network-profiles';
import { getWakeUnavailableReason } from '@/modules/wol-sender';
import { availabilityUnavailableReason } from '@/modules/wol-sender/availability';
import { wakeWaitResult, type WakeSessionState } from '@/lib/wake-session';

const idle: WakeSessionState = { phase: 'idle', message: '' };

/** Foreground-only workflow; leaving the route or changing networks cancels the wait. */
export function useWakeSession(device: Device) {
  const [state, setState] = useState<WakeSessionState>(idle);
  const run = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const busy = useRef(false);
  const clear = useCallback(() => {
    run.current++;
    busy.current = false;
    clearInterval(timer.current);
    timer.current = undefined;
  }, []);
  const cancel = useCallback(() => {
    clear();
    setState({ phase: 'cancelled', message: 'Wait cancelled. Any packet already sent cannot be recalled.' });
  }, [clear]);

  useFocusEffect(useCallback(() => {
    setState(idle);
    const subscription = AppState.addEventListener('change', value => {
      if (value !== 'active') cancel();
    });
    return () => { clear(); subscription.remove(); };
  }, [clear, cancel]));

  const start = async () => {
    if (busy.current || AppState.currentState !== 'active') return;
    const current = useDevicesStore.getState().devices.find(item => item.id === device.id);
    if (!current) return;
    const profiles = useNetworkProfilesStore.getState();
    const network = useAvailabilityStore.getState().network;
    const blocker = getWakeUnavailableReason() ?? availabilityUnavailableReason()
      ?? getNetworkMismatch(current, profiles.profiles, profiles.activeProfileId)
      ?? (!current.statusTarget ? 'Set up status checks before running a wake test.' : null)
      ?? (!network.available ? network.reason ?? 'Connect to a local network.' : null);
    if (blocker) { setState({ phase: 'failed', message: blocker }); return; }
    clear();
    const token = run.current;
    busy.current = true;
    const revision = JSON.stringify([current.macAddress, current.broadcastIp, current.statusTarget, current.networkProfileId]);
    const profileRevision = JSON.stringify([profiles.activeProfileId, profiles.profiles]);
    const environmentChanged = () => {
      const next = useDevicesStore.getState().devices.find(item => item.id === device.id);
      const nextNetwork = useAvailabilityStore.getState().network;
      const nextProfiles = useNetworkProfilesStore.getState();
      return !next || !nextNetwork.available || nextNetwork.key !== network.key
        || JSON.stringify([next.macAddress, next.broadcastIp, next.statusTarget, next.networkProfileId]) !== revision
        || JSON.stringify([nextProfiles.activeProfileId, nextProfiles.profiles]) !== profileRevision;
    };
    const finish = (next: WakeSessionState) => { clear(); setState(next); };
    setState({ phase: 'sending', message: 'Sending wake request…' });
    try {
      const request = await useDevicesStore.getState().wakeDevice(device.id);
      if (token !== run.current) return;
      if (environmentChanged()) { cancel(); return; }
      if (request?.result !== 'sent') {
        finish({ phase: 'failed', message: request?.error ?? 'The request could not start. Check the selected network and try again.' });
        return;
      }
      const since = Date.now();
      setState({ phase: 'waiting', message: 'Packet sent. Waiting up to one minute for a fresh response…' });
      useAvailabilityStore.getState().checkNow(device.id);
      timer.current = setInterval(() => {
        if (environmentChanged()) { cancel(); return; }
        const result = wakeWaitResult(useAvailabilityStore.getState().results[device.id], since, Date.now());
        if (result) finish(result);
      }, 500);
    } catch (error) {
      if (token === run.current) finish({ phase: 'failed', message: error instanceof Error ? error.message : 'The wake request failed. Try again.' });
    }
  };
  return { ...state, start, cancel, busy: state.phase === 'sending' || state.phase === 'waiting' };
}
