import { useState } from 'react';
import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { DeviceDetailsSheet } from '@/components/device-details-sheet';
import { useDevicesStore, type Device } from '@/store/devices';
import { useNetworkProfilesStore } from '@/store/network-profiles';
import { getNetworkMismatch } from '@/lib/network-profiles';
import { getWakeUnavailableReason } from '@/modules/wol-sender';

export function DeviceCard({ device }: { device: Device }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const wakeDevice = useDevicesStore(state => state.wakeDevice);
  const toggleFavorite = useDevicesStore(state => state.toggleFavorite);
  const group = useDevicesStore(state => state.groups.find(item => item.id === device.groupId));
  const { profiles, activeProfileId } = useNetworkProfilesStore();
  const profile = profiles.find(item => item.id === device.networkProfileId);
  const mismatch = getNetworkMismatch(device, profiles, activeProfileId);
  const unavailable = getWakeUnavailableReason();
  const sending = device.wakeStatus === 'sending';
  const disabled = sending || !!unavailable || !!mismatch;
  const status = sending ? 'Sending wake request…' : device.lastWakeRequest
    ? `Last request ${device.lastWakeRequest.result === 'sent' ? 'sent' : 'failed'} · ${new Date(device.lastWakeRequest.requestedAt).toLocaleString()}`
    : 'Ready for your first wake request';

  return <Card className="mb-3 border-border bg-card">
    <CardContent className="p-4 gap-3">
      <View className="flex-row items-start gap-3">
        <View className="rounded-xl bg-secondary p-3"><Icon name="computer" size={24} className="text-primary" /></View>
        <View className="flex-1 pt-1">
          <Text className="text-lg font-semibold">{device.name}</Text>
          <Text className="text-sm text-muted-foreground mt-1">{[group?.name, profile?.name ?? 'Local network'].filter(Boolean).join(' · ')}</Text>
        </View>
        <Button variant="ghost" size="icon" onPress={() => toggleFavorite(device.id)} accessibilityLabel={`${device.isFavorite ? 'Remove' : 'Add'} ${device.name} ${device.isFavorite ? 'from' : 'to'} favorites`} accessibilityState={{ selected: !!device.isFavorite }}>
          <Icon name={device.isFavorite ? 'star' : 'star-border'} size={24} className={device.isFavorite ? 'text-primary' : 'text-muted-foreground'} />
        </Button>
      </View>
      <Text accessibilityLiveRegion="polite" className={device.wakeStatus === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{status}</Text>
      {device.lastWakeRequest?.result === 'sent' ? <Text className="text-xs text-muted-foreground">Request sent; computer wake is not confirmed.</Text> : null}
      {device.wakeStatus === 'error' ? <Text className="text-sm text-muted-foreground">Check your connection or open Details for troubleshooting.</Text> : null}
      {mismatch ? <Text className="text-sm text-muted-foreground">{mismatch}</Text> : null}
      {unavailable ? <Text className="text-sm text-muted-foreground">{unavailable}</Text> : null}
      <View className="flex-row gap-3">
        <Button className="flex-1" disabled={disabled} accessibilityLabel={`Wake ${device.name}`} accessibilityState={{ disabled, busy: sending }} onPress={() => { void wakeDevice(device.id); }}>
          <Icon name="power-settings-new" size={20} className="text-primary-foreground" />
          <Text>{sending ? 'Sending…' : device.wakeStatus === 'error' ? 'Retry wake' : 'Wake'}</Text>
        </Button>
        <Button variant="outline" onPress={() => setDetailsOpen(true)} accessibilityLabel={`Details for ${device.name}`}><Text>Details</Text></Button>
      </View>
    </CardContent>
    <DeviceDetailsSheet device={device} open={detailsOpen} onOpenChange={setDetailsOpen} />
  </Card>;
}
