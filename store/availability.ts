import { create } from 'zustand';
import type { Availability, NetworkState } from '@/lib/availability';

export const useAvailabilityStore = create<{
  results: Record<string, Availability>;
  network: NetworkState;
  checkNow: (id: string) => void;
}>(() => ({ results: {}, network: { key: '', available: false, reason: 'Checking local network…' }, checkNow: () => {} }));

export function publishAvailability(id: string, result: Availability | undefined) {
  useAvailabilityStore.setState(state => {
    const results = { ...state.results };
    if (result) results[id] = result;
    else delete results[id];
    return { results };
  });
}
