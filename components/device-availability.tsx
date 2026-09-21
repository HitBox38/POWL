import { View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useAvailabilityStore } from '@/store/availability';
import { availabilityUnavailableReason } from '@/modules/wol-sender/availability';
import { targetLabel } from '@/lib/availability';
import type { Device } from '@/store/devices';

export function DeviceAvailability({ device, details = false }: { device: Device; details?: boolean }) {
  const result = useAvailabilityStore(state => state.results[device.id]);
  const available = useAvailabilityStore(state => state.network.available);
  const status = result?.status ?? 'unknown';
  const label = status === 'online' ? 'Online' : status === 'unreachable' ? 'Not reachable' : 'Unknown';
  return (
    <View className="gap-2">
      <Text accessibilityLiveRegion="polite" accessibilityLabel={`Availability: ${label}${result?.checking ? ', checking' : ''}`}
        className={status === 'online' ? 'text-sm text-green-700 dark:text-green-400' : status === 'unreachable' ? 'text-sm text-amber-700 dark:text-amber-400' : 'text-sm text-muted-foreground'}>
        ● {label}{result?.checking ? ' · Checking…' : ''}
      </Text>
      {details ? <>
        <Text className="text-sm text-muted-foreground">{targetLabel(device.statusTarget)}</Text>
        {result?.endpoint ? <Text className="text-sm text-muted-foreground">Checked address: {result.endpoint}</Text> : null}
        {result?.reason ? <Text className="text-sm text-muted-foreground">{result.reason}</Text> : null}
        <Text className="text-sm text-muted-foreground">{result?.checkedAt ? `Last checked: ${new Date(result.checkedAt).toLocaleTimeString()}` : 'Not checked yet.'}</Text>
        <Text className="text-sm text-muted-foreground">Not reachable means no response, not necessarily powered off. A firewall or stopped service can prevent a response.</Text>
        {device.statusTarget ? <Button variant="outline" disabled={!available || !!result?.checking || !!availabilityUnavailableReason()}
          onPress={() => useAvailabilityStore.getState().checkNow(device.id)}><Text>Check now</Text></Button> : null}
        <Button variant="ghost" disabled={device.wakeStatus === 'sending'} onPress={() => router.push({ pathname: '/device/[id]/edit', params: { id: device.id } })}>
          <Text>{device.statusTarget ? 'Change status checks' : 'Set up status checks'}</Text>
        </Button>
      </> : null}
    </View>
  );
}
