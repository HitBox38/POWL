import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMagicPacket } from '@/modules/wol-sender';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { getNetworkMismatch, resolveBroadcastIp } from '@/lib/network-profiles';

export type WakeStatus = 'idle' | 'sending' | 'success' | 'error';
export const WAKE_HISTORY_LIMIT = 20;

export type WakeRequest = {
  requestedAt: string;
  result: 'sent' | 'failed';
  macAddress: string;
  broadcastIp: string;
  error?: string;
};

export type Device = {
  id: string;
  name: string;
  macAddress: string;
  broadcastIp: string;
  networkProfileId?: string;
  /** Sending is transient; restart restores only the last completed result. */
  wakeStatus: WakeStatus;
  wakeError?: string;
  /** The last completed send attempt. This does not confirm the computer woke. */
  lastWakeRequest?: WakeRequest;
  wakeHistory?: WakeRequest[];
};

type DevicesState = {
  devices: Device[];
  addDevice: (device: Omit<Device, 'id' | 'wakeStatus' | 'wakeError' | 'lastWakeRequest' | 'wakeHistory'>) => void;
  addDevices: (devices: Pick<Device, 'name' | 'macAddress' | 'broadcastIp'>[]) => void;
  removeDevice: (id: string) => void;
  removeNetworkProfile: (id: string) => void;
  updateDevice: (id: string, updates: Partial<Pick<Device, 'name' | 'macAddress' | 'broadcastIp' | 'networkProfileId'>>) => void;
  setWakeStatus: (id: string, status: WakeStatus, error?: string) => void;
  wakeDevice: (id: string) => Promise<void>;
  clearWakeHistory: (id: string) => void;
};

export const useDevicesStore = create<DevicesState>()(
  persist(
    (set, get) => ({
      devices: [],

      addDevice: (device) =>
        set((state) => ({
          devices: [
            ...state.devices,
            {
              ...device,
              id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              wakeStatus: 'idle' as WakeStatus,
            },
          ],
        })),

      addDevices: (devices) => set((state) => ({
        devices: [...state.devices, ...devices.map((device, index) => ({
          ...device,
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
          wakeStatus: 'idle' as WakeStatus,
        }))],
      })),

      removeNetworkProfile: (id) => {
        if (!useDevicesStore.persist.hasHydrated() || !useNetworkProfilesStore.persist.hasHydrated()) return;
        const network = useNetworkProfilesStore.getState();
        const profile = network.profiles.find(item => item.id === id);
        if (!profile) return;
        set(state => ({ devices: state.devices.map(device => device.networkProfileId === id
          ? { ...device, networkProfileId: undefined, broadcastIp: profile.broadcastIp } : device) }));
        network.removeProfile(id);
      },

      removeDevice: (id) =>
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
        })),

      updateDevice: (id, updates) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      setWakeStatus: (id, status, error) =>
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === id
              ? { ...d, wakeStatus: status, wakeError: error }
              : d
          ),
        })),

      wakeDevice: async (id) => {
        if (!useDevicesStore.persist.hasHydrated() || !useNetworkProfilesStore.persist.hasHydrated()) return;
        const device = get().devices.find((item) => item.id === id);
        if (!device || device.wakeStatus === 'sending') return;

        const network = useNetworkProfilesStore.getState();
        const mismatch = getNetworkMismatch(device, network.profiles, network.activeProfileId);
        if (mismatch) return;

        const destination = {
          macAddress: device.macAddress,
          broadcastIp: resolveBroadcastIp(device, network.profiles),
        };
        const requestedAt = new Date().toISOString();
        get().setWakeStatus(id, 'sending');

        let request: WakeRequest;
        try {
          await sendMagicPacket(destination);
          request = { ...destination, requestedAt, result: 'sent' };
        } catch (error) {
          request = {
            ...destination,
            requestedAt,
            result: 'failed',
            error: error instanceof Error ? error.message : String(error),
          };
        }

        // Finish even if the card scrolls off screen; removed devices stay removed.
        set((state) => ({
          devices: state.devices.map((item) => item.id === id ? {
            ...item,
            wakeStatus: request.result === 'sent' ? 'success' : 'error',
            wakeError: request.error,
            lastWakeRequest: request,
            wakeHistory: [request, ...(item.wakeHistory ?? (item.lastWakeRequest ? [item.lastWakeRequest] : []))].slice(0, WAKE_HISTORY_LIMIT),
          } : item),
        }));
      },

      clearWakeHistory: (id) => set((state) => ({
        devices: state.devices.map((item) => item.id === id ? {
          ...item,
          wakeHistory: [],
          lastWakeRequest: undefined,
          wakeError: undefined,
          wakeStatus: item.wakeStatus === 'sending' ? 'sending' : 'idle',
        } : item),
      })),
    }),
    {
      name: 'powl-devices',
      storage: createJSONStorage(() => AsyncStorage),
      // A restart never restores an in-flight send. Keep the completed result.
      partialize: (state) => ({
        devices: state.devices.map(({ wakeStatus: _ws, wakeError: _we, ...rest }) => ({
          ...rest,
          wakeStatus: (rest.lastWakeRequest?.result === 'sent'
            ? 'success'
            : rest.lastWakeRequest?.result === 'failed' ? 'error' : 'idle') as WakeStatus,
          wakeError: rest.lastWakeRequest?.error,
        })),
      }),
    }
  )
);
