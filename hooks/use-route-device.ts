import { useLocalSearchParams } from "expo-router";
import { useDevicesStore } from "@/store/devices";

export function useRouteDevice() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return useDevicesStore((state) =>
    state.devices.find((device) => device.id === id),
  );
}
