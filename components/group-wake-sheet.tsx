import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Screen, goBack } from "@/components/screen";
import { getWakeUnavailableReason } from "@/modules/wol-sender";
import {
  useDevicesStore,
  type DeviceGroup,
  type GroupWakeResult,
} from "@/store/devices";
import { useNetworkProfilesStore } from "@/store/network-profiles";
import { getNetworkMismatch } from "@/lib/network-profiles";

type GroupWakeSheetProps = { group: DeviceGroup };

export function GroupWakeSheet({ group }: GroupWakeSheetProps) {
  const devices = useDevicesStore((state) => state.devices);
  const wakeGroup = useDevicesStore((state) => state.wakeGroup);
  const [sending, setSending] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [result, setResult] = useState<GroupWakeResult>();
  const members = devices.filter((device) => device.groupId === group.id);
  const profiles = useNetworkProfilesStore((state) => state.profiles);
  const activeProfileId = useNetworkProfilesStore(
    (state) => state.activeProfileId,
  );
  const eligible = members.filter(
    (device) =>
      device.wakeStatus !== "sending" &&
      !getNetworkMismatch(device, profiles, activeProfileId),
  );
  const unavailableReason = getWakeUnavailableReason();

  const send = async () => {
    if (sending) return;
    setBatchCount(eligible.length);
    setSending(true);
    try {
      setResult(await wakeGroup(group.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      title={`Wake ${group.name}`}
      subtitle="Send wake requests to computers in this group."
    >
      {result ? (
        <View className="gap-3" accessibilityLiveRegion="polite">
          <Text>
            {result.sent} sent · {result.failed} failed · {result.skipped}{" "}
            skipped
          </Text>
          <Text className="text-sm text-muted-foreground">
            Sent requests do not confirm computers are awake. Open a
            device&apos;s wake history for details. Devices already sending,
            removed, or on another selected network are skipped.
          </Text>
          <Button className="min-h-12" onPress={goBack}>
            <Text>Done</Text>
          </Button>
        </View>
      ) : (
        <>
          <Text accessibilityLiveRegion="polite">
            {sending
              ? `Sending ${batchCount} wake requests…`
              : `Send ${eligible.length} wake ${eligible.length === 1 ? "request" : "requests"}?`}
          </Text>
          <View className="gap-2">
            {members.map((device) => (
              <Text key={device.id} className="text-sm">
                {device.name}
                {!sending && device.wakeStatus === "sending"
                  ? " — already sending"
                  : !sending &&
                      getNetworkMismatch(device, profiles, activeProfileId)
                    ? " — network mismatch"
                    : ""}
              </Text>
            ))}
          </View>
          <Text className="text-sm text-muted-foreground">
            {sending
              ? "You can leave this screen; completed requests will appear in each device’s history."
              : `${members.length - eligible.length} device(s) already sending or on another selected network will be skipped. A sent request does not confirm the computer is awake.`}
          </Text>
          {unavailableReason ? (
            <Text className="text-sm text-muted-foreground">
              {unavailableReason}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-3">
            <Button variant="outline" className="min-h-12" onPress={goBack}>
              <Text>{sending ? "Close" : "Cancel"}</Text>
            </Button>
            <Button
              className="min-h-12"
              disabled={
                sending || !eligible.length || unavailableReason !== null
              }
              onPress={() => {
                void send();
              }}
            >
              <Text>
                {sending ? "Sending…" : `Send ${eligible.length} requests`}
              </Text>
            </Button>
          </View>
        </>
      )}
    </Screen>
  );
}
