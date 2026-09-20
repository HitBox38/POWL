import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type NetworkProfile } from '@/lib/network-profiles';

type ProfileFields = Pick<NetworkProfile, 'name' | 'broadcastIp'>;
type ProfilesState = {
  profiles: NetworkProfile[];
  activeProfileId: string | null;
  addProfile: (fields: ProfileFields) => void;
  updateProfile: (id: string, fields: ProfileFields) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;
};
export const useNetworkProfilesStore = create<ProfilesState>()(
  persist((set, _get, api) => ({
    profiles: [],
    activeProfileId: null,
    addProfile: (fields) => {
      if (!api.persist.hasHydrated()) return;
      set((state) => ({ profiles: [...state.profiles, { ...fields, id: `network-${Date.now()}-${Math.random().toString(36).slice(2, 10)}` }] }));
    },
    updateProfile: (id, fields) => {
      if (!api.persist.hasHydrated()) return;
      set((state) => ({ profiles: state.profiles.map((profile) => profile.id === id ? { ...profile, ...fields } : profile) }));
    },
    removeProfile: (id) => {
      if (!api.persist.hasHydrated()) return;
      set((state) => ({ profiles: state.profiles.filter((item) => item.id !== id), activeProfileId: state.activeProfileId === id ? null : state.activeProfileId }));
    },
    setActiveProfile: (id) => {
      if (!api.persist.hasHydrated()) return;
      set({ activeProfileId: id });
    },
  }), { name: 'powl-network-profiles', storage: createJSONStorage(() => AsyncStorage) }),
);
