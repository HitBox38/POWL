import { memo } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { WakeButton, useWakeBlocker } from "@/components/wake-button";
import { useDevicesStore, type Device } from "@/store/devices";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { wakeStatusLabel } from "@/lib/wake-status";
import { DeviceAvailability } from "@/components/device-availability";
import { useAvailabilityStore } from "@/store/availability";

export const DeviceCard = memo(function DeviceCard({ id }: { id: string }) {
  const device = useDevicesStore((state) =>
    state.devices.find((item) => item.id === id),
  );
  return device ? <DeviceRow device={device} /> : null;
});

function DeviceRow({ device }: { device: Device }) {
  const availability = useAvailabilityStore(state => state.results[device.id]?.status);
  const availabilityLabel = availability === 'online' ? 'Online' : availability === 'unreachable' ? 'Not reachable' : 'Unknown';
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale >= 1.3;
  const group = useDevicesStore(
    (state) => state.groups.find((item) => item.id === device.groupId)?.name,
  );
  const profile = useNetworkProfilesStore(
    (state) =>
      state.profiles.find((item) => item.id === device.networkProfileId)?.name,
  );
  const blocker = useWakeBlocker(device);
  return (
    <View className="border-b border-border py-4 gap-2">
      <View className={stacked ? "gap-3" : "flex-row items-center gap-3"}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Details for ${device.name}. Availability: ${availabilityLabel}.`}
          onPress={() =>
            router.push({ pathname: "/device/[id]", params: { id: device.id } })
          }
          className={`${stacked ? "" : "flex-1 "}min-h-12 flex-row items-center gap-3 active:opacity-70`}
        >
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-semibold tracking-tight shrink">
                {device.name}
              </Text>
              {device.isFavorite ? (
                <Icon name="star" size={15} className="text-muted-foreground" />
              ) : null}
            </View>
            {group || profile ? (
              <Text className="text-sm text-muted-foreground">
                {[group, profile].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            <DeviceAvailability device={device} />
            <Text
              accessibilityLiveRegion="polite"
              className={
                device.wakeStatus === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {wakeStatusLabel(device)}
            </Text>
          </View>
        </Pressable>
        <WakeButton device={device} />
      </View>
      {blocker && device.networkProfileId ? (
        <Text className="text-sm text-muted-foreground">{blocker}</Text>
      ) : null}
    </View>
  );
}
