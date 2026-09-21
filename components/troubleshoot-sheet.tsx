import { useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/screen";
import { WakeButton, useWakeBlocker } from "@/components/wake-button";
import { Text } from "@/components/ui/text";
import { getWakeUnavailableReason } from "@/modules/wol-sender";
import type { Device } from "@/store/devices";

type TroubleshootSheetProps = {
  device: Device;
};

export function TroubleshootSheet({ device }: TroubleshootSheetProps) {
  const [showDetails, setShowDetails] = useState(false);
  const unavailableReason = getWakeUnavailableReason();
  const blocker = useWakeBlocker(device);
  const diagnostic = device.wakeError ?? device.lastWakeRequest?.error;

  return (
    <Screen title="Troubleshooting" subtitle={device.name}>
      <View>
        <View className="gap-4">
          <Text className="text-sm text-muted-foreground">
            A sent request only confirms that POWL handed the packet to the
            network. It cannot confirm that the computer received it or woke up.
          </Text>
          <View className="gap-1">
            <Text className="font-semibold">1. Check the connection</Text>
            <Text className="text-sm text-muted-foreground">
              Connect your phone to the same local network as the computer.
              Guest Wi-Fi, a VPN, or router isolation may block wake packets.
              Waking from another network requires additional network
              configuration.
            </Text>
          </View>
          <View className="gap-1">
            <Text className="font-semibold">2. Check the saved device</Text>
            <Text className="text-sm text-muted-foreground">
              Use the MAC address of the computer&apos;s connected network
              adapter. Verify the broadcast address for that network; it depends
              on the subnet, so an address ending in .255 is not always correct.
            </Text>
          </View>
          <View className="gap-1">
            <Text className="font-semibold">3. Enable wake support</Text>
            <Text className="text-sm text-muted-foreground">
              Check the computer manufacturer&apos;s Wake-on-LAN instructions.
              You may need to enable it in BIOS/UEFI and the network
              adapter&apos;s power settings. Keep the computer connected to
              power; support for Wi-Fi and waking from shutdown varies by
              hardware.
            </Text>
          </View>
          <View className="gap-1">
            <Text className="font-semibold">4. Test and retry</Text>
            <Text className="text-sm text-muted-foreground">
              Start with the computer asleep on the same network, then send a
              request and check the computer directly. If sending succeeds but
              it stays asleep, revisit its wake settings and network
              configuration.
            </Text>
          </View>
          {unavailableReason ? (
            <Text className="text-sm text-muted-foreground">
              {unavailableReason}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
            onPress={() => setShowDetails((value) => !value)}
            className="min-h-12 justify-center"
          >
            <Text className="text-sm text-primary">
              {showDetails ? "Hide" : "Show"} technical details
            </Text>
          </Pressable>
          {showDetails ? (
            <View className="rounded-lg bg-secondary p-3 gap-2">
              <Text selectable className="text-sm font-mono">
                Saved MAC: {device.macAddress}
              </Text>
              <Text selectable className="text-sm font-mono">
                Saved broadcast: {device.broadcastIp}:9 (UDP)
              </Text>
              {device.lastWakeRequest ? (
                <>
                  <Text selectable className="text-sm">
                    Last attempt:{" "}
                    {new Date(
                      device.lastWakeRequest.requestedAt,
                    ).toLocaleString()}
                  </Text>
                  <Text selectable className="text-sm font-mono">
                    Attempt destination: {device.lastWakeRequest.macAddress} via{" "}
                    {device.lastWakeRequest.broadcastIp}:9
                  </Text>
                </>
              ) : null}
              <Text selectable className="text-sm">
                {diagnostic
                  ? `Send diagnostic: ${diagnostic}`
                  : "No send error recorded."}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {blocker ? (
        <Text className="text-muted-foreground">{blocker}</Text>
      ) : null}
      <WakeButton device={device} />
    </Screen>
  );
}
