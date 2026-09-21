import { useState } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/screen";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  useDevicesStore,
  WAKE_HISTORY_LIMIT,
  type Device,
  type WakeRequest,
} from "@/store/devices";

type WakeHistorySheetProps = {
  device: Device;
};

function HistoryEntry({ request }: { request: WakeRequest }) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  return (
    <View className="border-b border-border py-4 gap-1">
      <Text
        className={
          request.result === "sent"
            ? "font-semibold text-primary"
            : "font-semibold text-destructive"
        }
      >
        {request.result === "sent" ? "Request sent" : "Could not send request"}
      </Text>
      <Text className="text-sm">
        {new Date(request.requestedAt).toLocaleString()}
      </Text>
      <Text selectable className="text-sm text-muted-foreground font-mono">
        MAC: {request.macAddress}
      </Text>
      <Text selectable className="text-sm text-muted-foreground font-mono">
        Via {request.broadcastIp}:9 (UDP)
      </Text>
      {request.error ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDiagnostic }}
            onPress={() => setShowDiagnostic((value) => !value)}
            className="min-h-12 justify-center"
          >
            <Text className="text-sm text-primary">
              {showDiagnostic ? "Hide" : "Show"} send diagnostic
            </Text>
          </Pressable>
          {showDiagnostic ? (
            <Text selectable className="text-sm">
              {request.error}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function WakeHistorySheet({ device }: WakeHistorySheetProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const clearWakeHistory = useDevicesStore((state) => state.clearWakeHistory);
  const history =
    device.wakeHistory ??
    (device.lastWakeRequest ? [device.lastWakeRequest] : []);

  return (
    <Screen title="Wake history" subtitle={device.name}>
      <Text className="text-sm text-muted-foreground">
        The latest {WAKE_HISTORY_LIMIT} completed requests are kept on this
        phone. A sent request does not confirm that the computer woke up.
      </Text>
      <View>
        <View className="gap-3">
          {history.length ? (
            history.map((request, index) => (
              <HistoryEntry
                key={`${request.requestedAt}-${index}`}
                request={request}
              />
            ))
          ) : (
            <Text className="text-sm text-muted-foreground py-6">
              No completed wake requests yet.
            </Text>
          )}
        </View>
      </View>
      {history.length ? (
        <Button variant="outline" onPress={() => setConfirmClear(true)}>
          <Text>Clear history</Text>
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Clear wake history?"
        description={`Clear the saved requests for ${device.name}? New requests will still be recorded.`}
        action="Clear history"
        onConfirm={() => clearWakeHistory(device.id)}
      />
    </Screen>
  );
}
