import { View, Pressable, Alert } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDevicesStore, type Device, type WakeStatus } from '@/store/devices';
import { sendMagicPacket } from '@/modules/wol-sender';
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
  const { setWakeStatus, removeDevice } = useDevicesStore();
  const statusConfig = STATUS_CONFIG[device.wakeStatus];
  const isSending = device.wakeStatus === 'sending';

  const handleWake = async () => {
    if (isSending) return;
    setWakeStatus(device.id, 'sending');
    try {
      await sendMagicPacket({
        macAddress: device.macAddress,
        broadcastIp: device.broadcastIp,
      });
      setWakeStatus(device.id, 'success');
      // Reset back to idle after 3 seconds
      setTimeout(() => {
        setWakeStatus(device.id, 'idle');
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setWakeStatus(device.id, 'error', message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Device',
      `Remove "${device.name}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeDevice(device.id),
        },
      ]
    );
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
          </View>

          {/* Actions */}
          <View className="gap-2">
            <Button
              size="sm"
              onPress={handleWake}
              disabled={isSending}
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
              onPress={handleDelete}
              className="items-center justify-center rounded-md py-1 px-2 active:opacity-60"
            >
              <Text className="text-xs text-muted-foreground">Remove</Text>
            </Pressable>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}
