import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type WakeStatus = 'idle' | 'sending' | 'success' | 'error';

export type Device = {
  id: string;
  name: string;
  macAddress: string;
  broadcastIp: string;
  /** Transient — not persisted, resets on app restart */
  wakeStatus: WakeStatus;
  wakeError?: string;
};

type DevicesState = {
  devices: Device[];
  addDevice: (device: Omit<Device, 'id' | 'wakeStatus' | 'wakeError'>) => void;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, updates: Partial<Pick<Device, 'name' | 'macAddress' | 'broadcastIp'>>) => void;
  setWakeStatus: (id: string, status: WakeStatus, error?: string) => void;
};

export const useDevicesStore = create<DevicesState>()(
  persist(
    (set) => ({
      devices: [],

      addDevice: (device) =>
        set((state) => ({
          devices: [
            ...state.devices,
            {
              ...device,
              id: Date.now().toString(),
              wakeStatus: 'idle' as WakeStatus,
            },
          ],
        })),

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
    }),
    {
      name: 'powl-devices',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the device list, not transient wake status
      partialize: (state) => ({
        devices: state.devices.map(({ wakeStatus: _ws, wakeError: _we, ...rest }) => ({
          ...rest,
          wakeStatus: 'idle' as WakeStatus,
        })),
      }),
    }
  )
);
