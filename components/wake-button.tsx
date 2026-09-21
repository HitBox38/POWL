import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { useDevicesStore, type Device } from "@/store/devices";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { getNetworkMismatch } from "@/lib/network-profiles";
import { getWakeUnavailableReason } from "@/modules/wol-sender";

export function useWakeBlocker(device: Device) {
  return (
    useNetworkProfilesStore((state) =>
      getNetworkMismatch(device, state.profiles, state.activeProfileId),
    ) ?? getWakeUnavailableReason()
  );
}

export function WakeButton({
  device,
  test = false,
}: {
  device: Device;
  test?: boolean;
}) {
  const reason = useWakeBlocker(device);
  const sending = device.wakeStatus === "sending";
  const disabled = sending || !!reason;
  return (
    <Button
      disabled={disabled}
      accessibilityLabel={`${device.wakeStatus === "error" ? "Retry wake" : test ? "Test wake" : "Wake"} ${device.name}`}
      accessibilityHint={reason ?? undefined}
      accessibilityState={{ disabled, busy: sending }}
      onPress={async () => {
        const result = await useDevicesStore.getState().wakeDevice(device.id);
        if (result && Platform.OS !== "web")
          void Haptics.notificationAsync(
            result.result === "sent"
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Error,
          ).catch(() => {});
      }}
    >
      {!sending ? (
        <Icon
          name={
            device.wakeStatus === "error" ? "refresh" : "power-settings-new"
          }
          size={18}
          className="text-primary-foreground"
        />
      ) : null}
      <Text>
        {sending
          ? "Sending…"
          : device.wakeStatus === "error"
            ? "Retry"
            : test
              ? "Test wake"
              : "Wake"}
      </Text>
    </Button>
  );
}
