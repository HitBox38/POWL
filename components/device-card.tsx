import { useEffect, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDevicesStore, type Device, type WakeStatus } from '@/store/devices';
import { getWakeUnavailableReason, sendMagicPacket } from '@/modules/wol-sender';
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
    label: 'Packet sent!',
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
  const { setWakeStatus } = useDevicesStore();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[device.wakeStatus];
  const isSending = device.wakeStatus === 'sending';
  const attemptId = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      attemptId.current += 1;
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
      const status = useDevicesStore.getState().devices.find((item) => item.id === device.id)?.wakeStatus;
      if (status === 'sending' || status === 'success') setWakeStatus(device.id, 'idle');
    };
  }, [device.id, setWakeStatus]);

  const handleWake = async () => {
    if (useDevicesStore.getState().devices.find((item) => item.id === device.id)?.wakeStatus === 'sending') return;
    const currentAttempt = ++attemptId.current;
    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
    setWakeStatus(device.id, 'sending');
    try {
      await sendMagicPacket({
        macAddress: device.macAddress,
        broadcastIp: device.broadcastIp,
      });
      if (currentAttempt !== attemptId.current) return;
      setWakeStatus(device.id, 'success');
      // Reset back to idle after 3 seconds
      resetTimer.current = setTimeout(() => {
        if (currentAttempt !== attemptId.current) return;
        resetTimer.current = null;
        setWakeStatus(device.id, 'idle');
      }, 3000);
    } catch (err) {
      if (currentAttempt !== attemptId.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setWakeStatus(device.id, 'error', message);
    }
  };

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
              <Text className={cn('text-xs mt-1.5 font-medium', statusConfig.color)}>
                {device.wakeStatus === 'error' && device.wakeError
                  ? device.wakeError
                  : statusConfig.label}
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

