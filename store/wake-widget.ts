import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type WakeWidgetState = {
  selectedDeviceId: string | null;
  syncError: string | null;
  selectDevice: (id: string | null) => void;
  setSyncError: (error: string | null) => void;
};

export const useWakeWidgetStore = create<WakeWidgetState>()(persist((set) => ({
  selectedDeviceId: null,
  syncError: null,
  selectDevice: (selectedDeviceId) => set({ selectedDeviceId }),
  setSyncError: (syncError) => set({ syncError }),
}), {
  name: 'powl-wake-widget-selection',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: ({ selectedDeviceId }) => ({ selectedDeviceId }),
}));
