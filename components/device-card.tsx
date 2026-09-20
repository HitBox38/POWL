import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDevicesStore, type Device, type WakeStatus } from '@/store/devices';
import { getWakeUnavailableReason } from '@/modules/wol-sender';
import { DeviceDetailsSheet } from '@/components/device-details-sheet';
import { cn } from '@/lib/cn';

type DeviceCardProps = {
  device: Device;
};

const STATUS_CONFIG: Record<
  WakeStatus,
  { label: string; color: string; buttonLabel: string }
> = {
  idle: {
    label: '',
    color: '',
    buttonLabel: 'Wake',
  },
  sending: {
    label: 'Sending packet...',
    color: 'text-muted-foreground',
    buttonLabel: 'Sending...',
  },
  success: {
    label: 'Wake request sent',
    color: 'text-primary',
    buttonLabel: 'Wake',
  },
  error: {
    label: 'Failed to send',
    color: 'text-destructive',
    buttonLabel: 'Retry',
  },
};

export function DeviceCard({ device }: DeviceCardProps) {
  const wakeUnavailableReason = getWakeUnavailableReason();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const wakeDevice = useDevicesStore((state) => state.wakeDevice);
  const statusConfig = STATUS_CONFIG[device.wakeStatus];
  const isSending = device.wakeStatus === 'sending';
  const handleWake = () => { void wakeDevice(device.id); };

  return (
    <Card className="mb-3 border-border bg-card">
      <CardContent className="p-4">
        <View className="flex-row items-center justify-between">
          {/* Device info */}
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
              {device.name}
            </Text>
            <Text className="text-sm text-muted-foreground font-mono mt-0.5">
              {device.macAddress}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {device.broadcastIp}
            </Text>
            {statusConfig.label ? (
              <Text accessibilityLiveRegion="polite" className={cn('text-xs mt-1.5 font-medium', statusConfig.color)}>
                {device.wakeStatus === 'error' && device.wakeError
                  ? device.wakeError
                  : statusConfig.label}
              </Text>
            ) : null}
            {device.lastWakeRequest ? (
              <Text className="text-xs text-muted-foreground mt-1.5">
                Last request {device.lastWakeRequest.result === 'sent' ? 'sent' : 'failed'}: {'\n'}
                {new Date(device.lastWakeRequest.requestedAt).toLocaleString()}
              </Text>
            ) : null}
            {device.lastWakeRequest?.result === 'sent' ? (
              <Text className="text-xs text-muted-foreground mt-1.5">
                Sending a request does not confirm the computer is awake.
              </Text>
            ) : null}
            {wakeUnavailableReason ? (
              <Text className="text-xs text-muted-foreground mt-1.5">
                {wakeUnavailableReason}
              </Text>
            ) : null}
          </View>

          {/* Actions */}
          <View className="gap-2">
            <Button
              size="sm"
              onPress={handleWake}
              disabled={isSending || wakeUnavailableReason !== null}
              className={cn(
                'min-w-[80px]',
                device.wakeStatus === 'success' && 'bg-primary/20 border border-primary',
                device.wakeStatus === 'error' && 'bg-destructive/20 border border-destructive'
              )}
            >
              <Text
                className={cn(
                  'text-sm font-semibold',
                  device.wakeStatus === 'success' && 'text-primary',
                  device.wakeStatus === 'error' && 'text-destructive',
                  (device.wakeStatus === 'idle' || device.wakeStatus === 'sending') &&
                    'text-primary-foreground'
                )}
              >
                {statusConfig.buttonLabel}
              </Text>
            </Button>
            <Pressable
              onPress={() => setDetailsOpen(true)} accessibilityRole="button" accessibilityLabel={`Details for ${device.name}`}
              className="items-center justify-center rounded-md py-1 px-2 active:opacity-60"
            >
              <Text className="text-xs text-muted-foreground">Details</Text>
            </Pressable>
          </View>
        </View>
      </CardContent>
      <DeviceDetailsSheet device={device} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </Card>
  );
}

