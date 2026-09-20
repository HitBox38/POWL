import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useDevicesStore, type Device, type WakeStatus } from '@/store/devices';
import { getWakeUnavailableReason } from '@/modules/wol-sender';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { resolveBroadcastIp, getNetworkMismatch } from '@/lib/network-profiles';
import { DeviceDetailsSheet } from '@/components/device-details-sheet';
import { cn } from '@/lib/cn';
import { TroubleshootSheet } from '@/components/troubleshoot-sheet';
import { WakeHistorySheet } from '@/components/wake-history-sheet';
import { DeviceOrganizationSheet } from '@/components/device-organization-sheet';

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
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOrganization, setShowOrganization] = useState(false);
  const toggleFavorite = useDevicesStore((state) => state.toggleFavorite);
  const wakeUnavailableReason = getWakeUnavailableReason();
  const { profiles, activeProfileId } = useNetworkProfilesStore();
  const networkMismatch = getNetworkMismatch(device, profiles, activeProfileId);
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
              {resolveBroadcastIp(device, profiles)}
            </Text>
            {statusConfig.label ? (
              <Text accessibilityLiveRegion="polite" className={cn('text-xs mt-1.5 font-medium', statusConfig.color)}>
                {statusConfig.label}
              </Text>
            ) : null}
            {device.wakeStatus === 'error' ? (
              <Text className="text-xs text-muted-foreground mt-1.5">
                POWL couldn&apos;t send this request. Check your connection and saved network settings, then retry.
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
            {networkMismatch ? <Text className="text-sm text-muted-foreground mt-1.5">{networkMismatch}</Text> : null}
            {wakeUnavailableReason ? (
              <Text className="text-xs text-muted-foreground mt-1.5">
                {wakeUnavailableReason}
              </Text>
            ) : null}
          </View>

          {/* Actions */}
          <View className="gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${device.isFavorite ? 'Remove' : 'Add'} ${device.name} ${device.isFavorite ? 'from' : 'to'} favorites`}
              accessibilityState={{ selected: !!device.isFavorite }}
              onPress={() => toggleFavorite(device.id)}
              className="min-h-12 items-center justify-center"
            ><Text className="text-sm text-primary">{device.isFavorite ? '★ Favorite' : '☆ Favorite'}</Text></Pressable>
            <Button
              size="sm"
              onPress={handleWake}
              disabled={isSending || wakeUnavailableReason !== null || networkMismatch !== null}
              accessibilityLabel={`${statusConfig.buttonLabel} ${device.name}`}
              accessibilityState={{ disabled: isSending || wakeUnavailableReason !== null || networkMismatch !== null, busy: isSending }}
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
              className="min-h-12 min-w-12 items-center justify-center rounded-md py-3 px-2 active:opacity-60"
            >
              <Text className="text-xs text-muted-foreground">Details</Text>
            </Pressable>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-x-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Troubleshoot waking ${device.name}`}
            onPress={() => setShowTroubleshooting(true)}
            className="min-h-12 justify-center mt-1 active:opacity-60"
          >
            <Text className="text-sm text-primary">Troubleshoot</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Wake history for ${device.name}`}
            onPress={() => setShowHistory(true)}
            className="min-h-12 justify-center mt-1 active:opacity-60"
          >
            <Text className="text-sm text-primary">Wake history</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Organize ${device.name}`}
            onPress={() => setShowOrganization(true)}
            className="min-h-12 justify-center mt-1 active:opacity-60"
          ><Text className="text-sm text-primary">Organize</Text></Pressable>
        </View>
        {showTroubleshooting ? (
          <TroubleshootSheet
            device={device}
            open={showTroubleshooting}
            onOpenChange={setShowTroubleshooting}
            onRetry={handleWake}
          />
        ) : null}
        {showHistory ? (
          <WakeHistorySheet device={device} open={showHistory} onOpenChange={setShowHistory} />
        ) : null}
        {showOrganization ? <DeviceOrganizationSheet device={device} open={showOrganization} onOpenChange={setShowOrganization} /> : null}
      </CardContent>
      <DeviceDetailsSheet device={device} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </Card>
  );
}




