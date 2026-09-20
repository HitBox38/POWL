import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDevicesStore, WAKE_HISTORY_LIMIT, type Device, type WakeRequest } from '@/store/devices';

type WakeHistorySheetProps = {
  device: Device;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function HistoryEntry({ request }: { request: WakeRequest }) {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  return (
    <View className="rounded-xl bg-secondary p-4 gap-1">
      <Text className={request.result === 'sent' ? 'font-semibold text-primary' : 'font-semibold text-destructive'}>
        {request.result === 'sent' ? 'Request sent' : 'Could not send request'}
      </Text>
      <Text className="text-sm">{new Date(request.requestedAt).toLocaleString()}</Text>
      <Text selectable className="text-xs text-muted-foreground font-mono">MAC: {request.macAddress}</Text>
      <Text selectable className="text-xs text-muted-foreground font-mono">Via {request.broadcastIp}:9 (UDP)</Text>
      {request.error ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showDiagnostic }}
            onPress={() => setShowDiagnostic((value) => !value)}
            className="min-h-12 justify-center"
          >
            <Text className="text-sm text-primary">{showDiagnostic ? 'Hide' : 'Show'} send diagnostic</Text>
          </Pressable>
          {showDiagnostic ? <Text selectable className="text-sm">{request.error}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

export function WakeHistorySheet({ device, open, onOpenChange }: WakeHistorySheetProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const clearWakeHistory = useDevicesStore((state) => state.clearWakeHistory);
  const history = device.wakeHistory ?? (device.lastWakeRequest ? [device.lastWakeRequest] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle>Wake history</DialogTitle>
          <DialogDescription>{device.name}</DialogDescription>
        </DialogHeader>
        <Text className="text-sm text-muted-foreground">
          The latest {WAKE_HISTORY_LIMIT} completed requests are kept on this phone. A sent request does not confirm that the computer woke up.
        </Text>
        <View>
          <View className="gap-3">
            {history.length ? history.map((request, index) => (
              <HistoryEntry key={`${request.requestedAt}-${index}`} request={request} />
            )) : <Text className="text-sm text-muted-foreground py-6">No completed wake requests yet.</Text>}
          </View>
        </View>
        {history.length ? (
          confirmClear ? (
            <View className="gap-3">
              <Text>Clear wake history for {device.name}? This also removes the last request shown on its card. New requests will still be recorded.</Text>
              <View className="flex-row flex-wrap gap-3">
                <Button variant="outline" className="min-h-12" onPress={() => setConfirmClear(false)}><Text>Keep history</Text></Button>
                <Button
                  variant="destructive"
                  className="min-h-12"
                  onPress={() => { clearWakeHistory(device.id); setConfirmClear(false); }}
                ><Text>Clear history</Text></Button>
              </View>
            </View>
          ) : (
            <Button variant="outline" className="min-h-12" onPress={() => setConfirmClear(true)}><Text>Clear history</Text></Button>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
