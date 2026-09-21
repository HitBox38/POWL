import { useLocalSearchParams } from "expo-router";
import { NetworkProfileForm } from "@/components/network-profiles-sheet";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { MissingRecord } from "@/components/screen";
export default function NetworkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useNetworkProfilesStore((state) =>
    state.profiles.find((item) => item.id === id),
  );
  return profile ? (
    <NetworkProfileForm key={id} profile={profile} />
  ) : (
    <MissingRecord kind="Network" />
  );
}
