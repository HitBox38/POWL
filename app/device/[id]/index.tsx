import { useState } from "react";
import { Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "expo-router/react-navigation";
import {
  Screen,
  Section,
  SettingsRow,
  MissingRecord,
} from "@/components/screen";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { WakeButton, useWakeBlocker } from "@/components/wake-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useRouteDevice } from "@/hooks/use-route-device";
import { useDevicesStore, type Device } from "@/store/devices";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { resolveBroadcastIp } from "@/lib/network-profiles";
import { wakeStatusLabel } from "@/lib/wake-status";
import { DeviceAvailability } from "@/components/device-availability";

export default function DeviceDetailsScreen() {
  const device = useRouteDevice();
  return device ? <DeviceDetails device={device} /> : <MissingRecord />;
}
function DeviceDetails({ device }: { device: Device }) {
  const { added } = useLocalSearchParams<{ added?: string }>();
  const [removing, setRemoving] = useState(false);
  const group = useDevicesStore((state) =>
    state.groups.find((item) => item.id === device.groupId),
  );
  const profiles = useNetworkProfilesStore((state) => state.profiles);
  const blocker = useWakeBlocker(device);
  const { colors } = useTheme();
  const sending = device.wakeStatus === "sending";
  return (
    <Screen title="Device">
      <View className="gap-4">
        <View className="gap-2">
          <Text
            accessibilityRole="header"
            className="text-3xl font-semibold tracking-tight"
          >
            {device.name}
          </Text>
          {group ? (
            <Text className="text-muted-foreground">{group.name}</Text>
          ) : null}
        </View>
        {added && !device.lastWakeRequest ? (
          <Text className="text-muted-foreground leading-6">
            Device saved. Put your computer to sleep, then send a test request.
          </Text>
        ) : null}
        <Text
          accessibilityLiveRegion="polite"
          className={
            device.wakeStatus === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {wakeStatusLabel(device)}
        </Text>
        <WakeButton device={device} test={!!added && !device.lastWakeRequest} />
        <Text className="text-sm text-muted-foreground leading-5">
          A sent request doesn’t confirm your computer is awake.
        </Text>
        {blocker ? (
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">{blocker}</Text>
            {device.networkProfileId ? (
              <Button
                variant="outline"
                onPress={() => router.push("/networks")}
              >
                <Text>Choose network</Text>
              </Button>
            ) : null}
          </View>
        ) : null}
        {sending ? (
          <Text className="text-sm text-muted-foreground">
            Wait for this request to finish before editing or removing the
            device.
          </Text>
        ) : null}
      </View>
      <Section title="Availability">
        <DeviceAvailability device={device} details />
      </Section>
      <Section title="Saved details">
        <View className="border-t border-border">
          <View className="flex-row items-center justify-between py-3 border-b border-border gap-3">
            <Text className="flex-1">Favorite</Text>
            <Switch
              accessibilityLabel={`Favorite ${device.name}`}
              value={!!device.isFavorite}
              trackColor={{ true: colors.primary }}
              onValueChange={() =>
                useDevicesStore.getState().toggleFavorite(device.id)
              }
            />
          </View>
          <SettingsRow
            title="Group"
            detail={group?.name ?? "No group"}
            onPress={() =>
              router.push({
                pathname: "/device/[id]/group",
                params: { id: device.id },
              })
            }
          />
          <View className="py-4 gap-2 border-b border-border">
            <Text className="text-sm text-muted-foreground">MAC address</Text>
            <Text selectable className="font-mono">
              {device.macAddress}
            </Text>
          </View>
          <View className="py-4 gap-2 border-b border-border">
            <Text className="text-sm text-muted-foreground">
              Broadcast address
              {profiles.find((p) => p.id === device.networkProfileId)
                ? " · " +
                  profiles.find((p) => p.id === device.networkProfileId)?.name
                : ""}
            </Text>
            <Text selectable className="font-mono">
              {resolveBroadcastIp(device, profiles)}
            </Text>
          </View>
        </View>
        <Button
          variant="outline"
          disabled={sending}
          onPress={() =>
            router.push({
              pathname: "/device/[id]/edit",
              params: { id: device.id },
            })
          }
        >
          <Text>Edit device</Text>
        </Button>
      </Section>
      <View>
        <SettingsRow
          icon="history"
          title="Wake history"
          onPress={() =>
            router.push({
              pathname: "/device/[id]/history",
              params: { id: device.id },
            })
          }
        />
        <SettingsRow
          icon="help-outline"
          title="Troubleshooting"
          onPress={() =>
            router.push({
              pathname: "/device/[id]/troubleshoot",
              params: { id: device.id },
            })
          }
        />
      </View>
      <Button
        variant="ghost"
        disabled={sending}
        onPress={() => setRemoving(true)}
      >
        <Text className="text-destructive">Remove device</Text>
      </Button>
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        disabled={sending}
        title="Remove device?"
        description={`Remove ${device.name} from this phone? This won’t change or shut down your computer.`}
        action="Remove device"
        onConfirm={() => {
          if (
            useDevicesStore
              .getState()
              .devices.find((item) => item.id === device.id)?.wakeStatus ===
            "sending"
          )
            return;
          useDevicesStore.getState().removeDevice(device.id);
          router.dismissTo("/");
        }}
      />
    </Screen>
  );
}
